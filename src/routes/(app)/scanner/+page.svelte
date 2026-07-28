<script lang="ts">
  import { onMount } from "svelte";
  import {
    triggerScan,
    getScanStatus,
    getLatestAsset,
    checkAssets,
  } from "$lib/api";

  // ── State ────────────────────────────────────────────────────────────────
  let scanType = $state<"product" | "group">("product");
  let scanSecret = $state("");
  let scanning = $state(false);
  let error = $state("");
  let success = $state("");

  let scanLogId = $state<number | null>(null);
  let scanStatus = $state<any>(null);
  let pollInterval = $state<ReturnType<typeof setInterval> | null>(null);

  let scanHistory = $state<
    Array<{
      id: number;
      type: string;
      status: string;
      startId: number;
      endId: number;
      time: string;
    }>
  >([]);

  // Discovered assets list
  let discoveredAssets = $state<any[]>([]);
  let loadingAssets = $state(false);
  let loadingMoreAssets = $state(false);
  let latestId = $state<number | null>(null);
  let sortOrder = $state<"asc" | "desc">("desc");
  let hasMoreAssets = $state(true);

  // Asset detail modal state
  import { getScanSku } from "$lib/api";
  let selectedAsset = $state<any | null>(null);
  let loadingAssetDetail = $state(false);
  let assetSkus = $state<number[]>([]);
  let assetUrls = $state<string[]>([]);

  async function showAssetDetail(asset: any) {
    selectedAsset = asset;
    assetSkus = [];
    assetUrls = [];

    // Group assets already carry their full title/description/thumbnail from the
    // shop scan — no separate SKU-image discovery needed for them.
    if (scanType === "group") {
      loadingAssetDetail = false;
      return;
    }

    loadingAssetDetail = true;
    try {
      const data = await getScanSku(parseInt(asset.id), scanType);
      assetSkus = data.skus;
      assetUrls = data.urls;
    } catch (e) {
      console.error("Failed to load asset details:", e);
    } finally {
      loadingAssetDetail = false;
    }
  }

  // ── Fetch Discovered Assets ──────────────────────────────────────────────
  async function loadDiscoveredAssets() {
    loadingAssets = true;
    hasMoreAssets = true;
    try {
      const latest = await getLatestAsset(scanType);
      if (latest && latest.id && latest.id !== "0") {
        const startId = parseInt(latest.id);
        latestId = startId;

        const initialStart = sortOrder === "desc" ? startId : 1;
        const data = await checkAssets(scanType, initialStart, 60, sortOrder);
        discoveredAssets = data;
        hasMoreAssets = data.length > 0;
      } else {
        discoveredAssets = [];
        latestId = null;
      }
    } catch (e: any) {
      console.error("Failed to load discovered assets:", e);
    } finally {
      loadingAssets = false;
    }
  }

  async function loadMoreAssets() {
    if (loadingMoreAssets || discoveredAssets.length === 0) return;
    loadingMoreAssets = true;
    try {
      const lastAsset = discoveredAssets[discoveredAssets.length - 1];
      const lastIdNum = parseInt(lastAsset.id);

      let data: any[] = [];
      if (sortOrder === "desc") {
        const nextStartId = lastIdNum - 1;
        if (nextStartId > 0) {
          data = await checkAssets(scanType, nextStartId, 60, "desc");
        }
      } else {
        const nextStartId = lastIdNum + 1;
        if (latestId && nextStartId <= latestId) {
          data = await checkAssets(scanType, nextStartId, 60, "asc");
        }
      }

      if (data.length > 0) {
        const newAssets = data.filter(
          (newAsset) =>
            !discoveredAssets.some((existing) => existing.id === newAsset.id),
        );
        if (newAssets.length > 0) {
          discoveredAssets = [...discoveredAssets, ...newAssets];
        } else {
          hasMoreAssets = false;
        }
      } else {
        hasMoreAssets = false;
      }
    } catch (e: any) {
      console.error("Failed to load more discovered assets:", e);
    } finally {
      loadingMoreAssets = false;
    }
  }

  // Load when scanType or sortOrder changes
  $effect(() => {
    scanType;
    sortOrder;
    loadDiscoveredAssets();
  });

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleStartScan() {
    if (!scanSecret.trim()) {
      error = "Scan secret is required";
      return;
    }

    scanning = true;
    error = "";
    success = "";
    scanStatus = null;

    try {
      const data = await triggerScan(scanType, scanSecret.trim());
      scanLogId = data.scan_log_id;

      scanHistory = [
        {
          id: data.scan_log_id,
          type: scanType,
          status: "running",
          startId: data.startId,
          endId: data.endId,
          time: new Date().toLocaleTimeString(),
        },
        ...scanHistory,
      ];

      success = `Scan started! ID: ${data.scan_log_id} (scanning IDs ${data.startId}–${data.endId})`;

      // Start polling
      startPolling(data.scan_log_id);
    } catch (e: any) {
      error = e.message || "Failed to start scan";
    } finally {
      scanning = false;
    }
  }

  function startPolling(logId: number) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        const data = await getScanStatus(logId);
        scanStatus = data;

        // Update history
        const idx = scanHistory.findIndex((h) => h.id === logId);
        if (idx >= 0) {
          scanHistory[idx].status = data.status;
        }

        if (data.status === "done" || data.status === "error") {
          if (pollInterval) clearInterval(pollInterval);
          pollInterval = null;
          loadDiscoveredAssets(); // reload when done
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
  }

  async function checkStatus(logId: number) {
    try {
      const data = await getScanStatus(logId);
      scanStatus = data;
      scanLogId = logId;

      if (data.status === "running") {
        startPolling(logId);
      } else if (data.status === "done") {
        loadDiscoveredAssets();
      }
    } catch (e: any) {
      error = e.message || "Failed to check status";
    }
  }

  // Cleanup on unmount
  import { onDestroy } from "svelte";
  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  function progressPct(scanned: number) {
    return Math.min(99, Math.round((scanned / 1000) * 100));
  }
</script>

<svelte:head>
  <title>Asset Scanner — Admin Panel</title>
</svelte:head>

<div class="scan-page">
  <header class="page-head">
    <h1 class="page-title">Asset Scanner</h1>
    <p class="page-desc">
      Walk the BNK48 CDN by ID and surface every product photo or group asset as
      it's found — point it at a range, then let it run.
    </p>
  </header>

  <!-- Alerts -->
  {#if error}
    <div class="note note-error fade-in">
      <i class="ti ti-alert-circle"></i>
      <span>{error}</span>
      <button
        class="note-dismiss"
        onclick={() => (error = "")}
        aria-label="Dismiss"
      >
        <i class="ti ti-x"></i>
      </button>
    </div>
  {/if}

  {#if success}
    <div class="note note-success fade-in">
      <i class="ti ti-circle-check"></i>
      <span>{success}</span>
      <button
        class="note-dismiss"
        onclick={() => (success = "")}
        aria-label="Dismiss"
      >
        <i class="ti ti-x"></i>
      </button>
    </div>
  {/if}

  <!-- Scan launcher -->
  <section class="launcher">
    <div class="launcher-copy">
      <h2 class="launcher-title">Run a scan</h2>
      <p class="launcher-desc">
        Pick what kind of asset to walk and confirm with the scan secret.
        Product scans check individual SKUs; group scans check shared group
        imagery.
      </p>
      <div class="type-toggle" role="group" aria-label="Asset type">
        <button
          class="type-option"
          class:selected={scanType === "product"}
          onclick={() => (scanType = "product")}
        >
          <i class="ti ti-box"></i> Product
        </button>
        <button
          class="type-option"
          class:selected={scanType === "group"}
          onclick={() => (scanType = "group")}
        >
          <i class="ti ti-users-group"></i> Group
        </button>
      </div>
    </div>

    <div class="launcher-action">
      <label class="launcher-label" for="scan-secret">Scan secret</label>
      <input
        id="scan-secret"
        type="username"
        class="launcher-input"
        placeholder="Enter secret key"
        bind:value={scanSecret}
      />
      <button
        class="launcher-btn"
        onclick={handleStartScan}
        disabled={scanning}
      >
        {#if scanning}
          <i class="ti ti-loader ti-spin"></i> Starting…
        {:else}
          <i class="ti ti-player-play"></i> Start scan
        {/if}
      </button>
    </div>
  </section>

  <!-- Live status -->
  {#if scanStatus}
    <section class="status-card fade-in">
      <div class="status-head">
        <h2 class="status-title">Scan progress</h2>
        <span
          class="status-pill"
          class:is-running={scanStatus.status === "running"}
          class:is-done={scanStatus.status === "done"}
          class:is-error={scanStatus.status === "error"}
        >
          <span class="status-dot" class:pulse={scanStatus.status === "running"}
          ></span>
          {scanStatus.status}
        </span>
      </div>

      <div class="metric-row">
        <div class="metric">
          <span class="metric-value">{scanStatus.type || scanType}</span>
          <span class="metric-label">Type</span>
        </div>
        <div class="metric">
          <span class="metric-value accent-blue"
            >{scanStatus.scanned_count ?? "—"}</span
          >
          <span class="metric-label">Scanned</span>
        </div>
        <div class="metric">
          <span class="metric-value accent-green"
            >{scanStatus.found_count ?? "—"}</span
          >
          <span class="metric-label">Found</span>
        </div>
        <div class="metric">
          <span class="metric-value metric-value-sm">
            {scanStatus.created_at
              ? new Date(scanStatus.created_at).toLocaleTimeString()
              : "—"}
          </span>
          <span class="metric-label">Started</span>
        </div>
        {#if scanStatus.finished_at}
          <div class="metric">
            <span class="metric-value metric-value-sm">
              {new Date(scanStatus.finished_at).toLocaleTimeString()}
            </span>
            <span class="metric-label">Finished</span>
          </div>
        {/if}
      </div>

      {#if scanStatus.status === "running" && scanStatus.scanned_count != null}
        <div class="status-progress">
          <div class="status-progress-track">
            <div
              class="status-progress-fill"
              style="width: {progressPct(scanStatus.scanned_count)}%;"
            ></div>
          </div>
          <p class="status-progress-note">
            Scanning… {scanStatus.scanned_count} checked so far
          </p>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Discovered assets -->
  <section class="assets">
    <div class="assets-head">
      <div>
        <h2 class="assets-title">
          Discovered {scanType === "product" ? "products" : "groups"}
        </h2>
        {#if latestId}
          <p class="assets-note">Latest known ID is #{latestId}</p>
        {/if}
      </div>
      <div class="assets-controls">
        <select bind:value={sortOrder} class="assets-sort">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <button
          class="assets-refresh"
          onclick={loadDiscoveredAssets}
          disabled={loadingAssets}
        >
          {#if loadingAssets}
            <i class="ti ti-loader ti-spin"></i>
          {:else}
            <i class="ti ti-refresh"></i>
          {/if}
          Refresh
        </button>
      </div>
    </div>

    {#if loadingAssets && discoveredAssets.length === 0}
      <div class="asset-grid">
        {#each Array(6) as _}
          <div class="asset-tile">
            <div class="asset-skel asset-skel-img"></div>
            <div class="asset-tile-body">
              <div class="asset-skel" style="width: 60%; height: 14px;"></div>
              <div class="asset-skel" style="width: 40%; height: 12px;"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if discoveredAssets.length === 0}
      <div class="assets-empty">
        <i class="ti ti-image"></i>
        <p>
          No discovered assets yet for this type. Run a scan to populate this
          list.
        </p>
      </div>
    {:else}
      <div class="asset-grid">
        {#each discoveredAssets as asset}
          <button
            class="asset-tile fade-in"
            onclick={() => showAssetDetail(asset)}
          >
            <div class="asset-thumb">
              {#if asset.url}
                <img src={asset.url} alt="ID {asset.id}" loading="lazy" />
              {:else}
                <div class="asset-thumb-empty"><i class="ti ti-image"></i></div>
              {/if}
              {#if asset.extra_skus && asset.extra_skus.length > 0}
                <span class="asset-badge">{asset.extra_skus.length} SKUs</span>
              {/if}
            </div>
            <div class="asset-tile-body">
              <span class="asset-id">#{asset.id}</span>
              {#if asset.title}
                <h3 class="asset-name truncate" title={asset.title}>
                  {asset.title}
                </h3>
              {/if}
              {#if asset.description}
                <p class="asset-desc truncate" title={asset.description}>
                  {asset.description}
                </p>
              {/if}
            </div>
          </button>
        {/each}
      </div>

      {#if hasMoreAssets}
        <div class="assets-load-more">
          <button
            class="load-more-btn"
            onclick={loadMoreAssets}
            disabled={loadingMoreAssets}
          >
            {#if loadingMoreAssets}
              <i class="ti ti-loader ti-spin"></i> Loading…
            {:else}
              Load more
            {/if}
          </button>
        </div>
      {/if}
    {/if}
  </section>

  <!-- Session history -->
  {#if scanHistory.length > 0}
    <section class="history">
      <h2 class="history-title">This session</h2>
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Log</th>
              <th>Type</th>
              <th>Range</th>
              <th>Status</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each scanHistory as entry}
              <tr>
                <td class="history-mono">#{entry.id}</td>
                <td><span class="history-type">{entry.type}</span></td>
                <td class="history-muted">{entry.startId}–{entry.endId}</td>
                <td>
                  <span
                    class="status-pill status-pill-sm"
                    class:is-running={entry.status === "running"}
                    class:is-done={entry.status === "done"}
                    class:is-error={entry.status === "error"}
                  >
                    <span
                      class="status-dot"
                      class:pulse={entry.status === "running"}
                    ></span>
                    {entry.status}
                  </span>
                </td>
                <td class="history-muted">{entry.time}</td>
                <td>
                  <button
                    class="history-check"
                    onclick={() => checkStatus(entry.id)}
                  >
                    <i class="ti ti-refresh"></i> Check
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if !scanStatus && scanHistory.length === 0}
    <div class="assets-empty">
      <i class="ti ti-panorama-horizontal"></i>
      <p>
        Set the asset type and secret above, then start a scan to discover CDN
        assets.
      </p>
    </div>
  {/if}

  <!-- Asset detail modal -->
  {#if selectedAsset}
    <div
      class="modal-scrim fade-in"
      onclick={() => (selectedAsset = null)}
      role="presentation"
    >
      <div
        class="modal-panel fade-in-scale"
        onclick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div class="modal-head">
          <h2 class="modal-title">
            {scanType === "product" ? "Product details" : "Group details"}
          </h2>
          <button
            class="modal-close"
            onclick={() => (selectedAsset = null)}
            aria-label="Close"
          >
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="modal-media">
            {#if loadingAssetDetail}
              <div class="modal-media-empty">
                <i class="ti ti-loader ti-spin"></i>
              </div>
            {:else if assetUrls.length > 0}
              <div class="modal-slider">
                {#each assetUrls as imgUrl}
                  <img
                    src={imgUrl}
                    alt="Asset {selectedAsset.id}"
                    class="modal-slide"
                  />
                {/each}
              </div>
              <div class="modal-thumbs">
                {#each assetUrls as imgUrl, idx}
                  <button
                    class="modal-thumb-btn"
                    aria-label="View image {idx + 1}"
                    onclick={(e) => {
                      const slider = e.currentTarget
                        .closest(".modal-media")
                        ?.querySelector(".modal-slider");
                      const imgs = slider?.querySelectorAll(".modal-slide");
                      imgs?.[idx]?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "start",
                      });
                    }}
                  >
                    <img src={imgUrl} alt="thumb" />
                  </button>
                {/each}
              </div>
            {:else if selectedAsset.url}
              <img
                src={selectedAsset.url}
                alt="ID {selectedAsset.id}"
                class="modal-slide"
              />
            {:else}
              <div class="modal-media-empty"><i class="ti ti-image"></i></div>
            {/if}

            {#if selectedAsset.url}
              <a
                href={selectedAsset.url}
                target="_blank"
                rel="noopener"
                class="modal-open-link"
              >
                <i class="ti ti-up-right-from-square"></i> Open original image
              </a>
            {/if}
          </div>

          <div class="modal-info">
            {#if selectedAsset.title}
              <div class="modal-field">
                <span class="modal-field-label">Title</span>
                <p class="modal-field-value">{selectedAsset.title}</p>
              </div>
            {/if}

            {#if selectedAsset.description}
              <div class="modal-field">
                <span class="modal-field-label">Description</span>
                <p class="modal-field-value modal-field-muted">
                  {selectedAsset.description}
                </p>
              </div>
            {/if}

            {#if scanType === "group"}
              {#if !selectedAsset.title && !selectedAsset.description}
                <p class="modal-field-muted">
                  No shop data found for this group yet — run a Group scan to
                  fetch its title/description.
                </p>
              {/if}
            {:else}
              <div class="modal-field">
                <span class="modal-field-label">SKUs discovered</span>
                {#if loadingAssetDetail}
                  <div
                    class="asset-skel"
                    style="width: 120px; height: 24px; margin-top: 4px;"
                  ></div>
                {:else if assetSkus.length === 0}
                  <p class="modal-field-muted">No SKUs found.</p>
                {:else}
                  <div class="modal-sku-list">
                    {#each assetSkus as sku}
                      <span class="modal-sku">SKU {sku}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .scan-page {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* ── Hero ─────────────────────────────────────────────────────────── */

  /* ── Notes ────────────────────────────────────────────────────────── */
  .note {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
  }

  .note-error {
    background: #fef2f2;
    color: var(--color-error);
    border: 1px solid #fecaca;
  }

  .note-success {
    background: #ecfdf5;
    color: var(--color-accent-green);
    border: 1px solid #a7f3d0;
  }

  .note-dismiss {
    margin-left: auto;
    background: none;
    border: none;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
    padding: 4px;
  }

  .note-dismiss:hover {
    opacity: 1;
  }

  /* ── Launcher ─────────────────────────────────────────────────────── */
  .launcher {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 40px;
    padding: 40px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
  }

  .launcher-title {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 10px;
  }

  .launcher-desc {
    font-size: 15px;
    line-height: 1.7;
    color: var(--muted);
    margin-bottom: 24px;
    max-width: 440px;
  }

  .type-toggle {
    display: inline-flex;
    padding: 4px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 999px;
    gap: 4px;
  }

  .type-option {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .type-option:hover {
    color: var(--ink);
  }

  .type-option.selected {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .launcher-action {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
  }

  .launcher-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
  }

  .launcher-input {
    width: 100%;
    padding: 14px 16px;
    font-size: 15px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--white);
    color: var(--ink);
    outline: none;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .launcher-input:focus {
    border-color: var(--color-accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  .launcher-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 52px;
    margin-top: 4px;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-size: 15px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    box-shadow: var(--shadow-button);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out);
  }

  .launcher-btn:hover {
    background: var(--color-secondary);
  }

  .launcher-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Status card ──────────────────────────────────────────────────── */
  .status-card {
    padding: 32px;
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: none;
  }

  .status-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .status-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    background: var(--card);
    color: var(--muted);
  }

  .status-pill-sm {
    padding: 4px 10px;
  }

  .status-pill.is-running {
    background: #eff6ff;
    color: var(--color-accent-blue);
  }

  .status-pill.is-done {
    background: #ecfdf5;
    color: var(--color-accent-green);
  }

  .status-pill.is-error {
    background: #fef2f2;
    color: var(--color-error);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-dot.pulse {
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .metric-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 24px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-value {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
    text-transform: capitalize;
  }

  .metric-value-sm {
    font-size: 18px;
    text-transform: none;
  }

  .metric-value.accent-blue {
    color: var(--color-accent-blue);
  }
  .metric-value.accent-green {
    color: var(--color-accent-green);
  }

  .metric-label {
    font-size: 13px;
    color: var(--muted);
  }

  .status-progress {
    margin-top: 24px;
  }

  .status-progress-track {
    height: 6px;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
  }

  .status-progress-fill {
    height: 100%;
    background: var(--color-accent-blue);
    border-radius: 999px;
    transition: width var(--duration-slow) var(--ease-out);
  }

  .status-progress-note {
    margin-top: 8px;
    font-size: 13px;
    color: var(--muted);
    text-align: right;
  }

  /* ── Assets ───────────────────────────────────────────────────────── */
  .assets-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
  }

  .assets-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
  }

  .assets-note {
    font-size: 13px;
    color: var(--muted);
    margin-top: 4px;
  }

  .assets-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .assets-sort {
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--white);
    color: var(--ink);
    outline: none;
  }

  .assets-refresh {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
  }

  .assets-refresh:hover {
    background: var(--card);
  }

  .asset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 20px;
  }

  .asset-tile {
    display: flex;
    flex-direction: column;
    text-align: left;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    transition:
      box-shadow var(--duration-normal) var(--ease-out),
      border-color var(--duration-normal) var(--ease-out);
  }

  .asset-tile:hover {
    box-shadow: none;
    border-color: var(--color-hairline-soft);
  }

  .asset-thumb {
    position: relative;
    aspect-ratio: 1 / 1;
    background: var(--card);
  }

  .asset-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .asset-thumb-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 24px;
  }

  .asset-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-accent-green);
    background: rgba(236, 253, 245, 0.95);
    border-radius: 999px;
  }

  .asset-tile-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .asset-id {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }

  .asset-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }

  .asset-desc {
    font-size: 12px;
    color: var(--muted);
  }

  .asset-skel {
    background: var(--card);
    background-size: 200% 100%;
    animation: skel-shimmer 1.5s ease-in-out infinite;
    border-radius: 8px;
  }

  .asset-skel-img {
    aspect-ratio: 1 / 1;
    border-radius: 0;
  }

  @keyframes skel-shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .assets-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64px 24px;
    text-align: center;
    color: var(--muted);
    background: var(--card);
    border-radius: 16px;
  }

  .assets-empty i {
    font-size: 32px;
    opacity: 0.4;
    margin-bottom: 16px;
  }

  .assets-empty p {
    max-width: 380px;
  }

  .assets-load-more {
    display: flex;
    justify-content: center;
    margin-top: 28px;
  }

  .load-more-btn {
    padding: 12px 28px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
  }

  .load-more-btn:hover {
    background: var(--card);
  }

  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── History ──────────────────────────────────────────────────────── */
  .history-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 16px;
  }

  .history-table-wrap {
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }

  .history-table {
    width: 100%;
    border-collapse: collapse;
  }

  .history-table th {
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    padding: 14px 20px;
    background: var(--card);
    border-bottom: 1px solid var(--border);
  }

  .history-table td {
    padding: 16px 20px;
    font-size: 14px;
    color: var(--ink);
    border-bottom: 1px solid var(--border);
  }

  .history-table tr:last-child td {
    border-bottom: none;
  }

  .history-mono {
    font-family: var(--font-mono);
    font-size: 13px;
  }

  .history-type {
    text-transform: capitalize;
    color: var(--ink);
    font-weight: 500;
  }

  .history-muted {
    color: var(--muted);
  }

  .history-check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
  }

  .history-check:hover {
    background: var(--card);
  }

  /* ── Modal ────────────────────────────────────────────────────────── */
  .modal-scrim {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    z-index: 1000;
  }

  .modal-panel {
    width: 100%;
    max-width: 820px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--white);
    border-radius: 16px;
    padding: 36px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    box-shadow: none;
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
  }

  .modal-close {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
  }

  .modal-close:hover {
    background: var(--card);
    color: var(--ink);
  }

  .modal-body {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 32px;
  }

  .modal-media {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .modal-slider {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    border-radius: 12px;
  }

  .modal-slide {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    scroll-snap-align: start;
    border-radius: 12px;
  }

  .modal-media-empty {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    background: var(--card);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 40px;
  }

  .modal-thumbs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .modal-thumb-btn {
    flex-shrink: 0;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }

  .modal-thumb-btn img {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 3px;
  }

  .modal-thumb-btn:hover {
    border-color: var(--ink);
  }

  .modal-open-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 8px;
    text-decoration: none;
  }

  .modal-open-link:hover {
    background: var(--card);
  }

  .modal-info {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .modal-field-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .modal-field-value {
    font-size: 15px;
    font-weight: 500;
    color: var(--ink);
  }

  .modal-field-muted {
    font-weight: 400;
    color: var(--muted);
  }

  .modal-sku-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .modal-sku {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-accent-green);
    background: #ecfdf5;
    border-radius: 999px;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fade-in {
    animation: fade-in var(--duration-normal) var(--ease-out);
  }

  .fade-in-scale {
    animation: fade-in-scale 0.2s var(--ease-out);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in-scale {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ── Responsive ───────────────────────────────────────────────────── */
  @media (max-width: 800px) {
    .launcher {
      grid-template-columns: 1fr;
      padding: 28px;
    }

    .modal-body {
      grid-template-columns: 1fr;
    }

    .modal-panel {
      padding: 24px;
    }
  }

  @media (max-width: 640px) {
    .metric-row {
      grid-template-columns: repeat(2, 1fr);
    }

    .assets-head {
      align-items: flex-start;
    }
  }
</style>
