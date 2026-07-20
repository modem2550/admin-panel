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
  let sortOrder = $state<'asc' | 'desc'>('desc');
  let hasMoreAssets = $state(true);

  // Asset detail modal state
  import { getScanSku } from "$lib/api";
  let selectedAsset = $state<any | null>(null);
  let loadingAssetDetail = $state(false);
  let assetSkus = $state<number[]>([]);
  let assetUrls = $state<string[]>([]);

  async function showAssetDetail(asset: any) {
    selectedAsset = asset;
    loadingAssetDetail = true;
    assetSkus = [];
    assetUrls = [];
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
        
        const initialStart = sortOrder === 'desc' ? startId : 1;
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
      if (sortOrder === 'desc') {
        const nextStartId = lastIdNum - 1;
        if (nextStartId > 0) {
          data = await checkAssets(scanType, nextStartId, 60, 'desc');
        }
      } else {
        const nextStartId = lastIdNum + 1;
        if (latestId && nextStartId <= latestId) {
          data = await checkAssets(scanType, nextStartId, 60, 'asc');
        }
      }
      
      if (data.length > 0) {
        const newAssets = data.filter(
          (newAsset) => !discoveredAssets.some((existing) => existing.id === newAsset.id)
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
</script>

<svelte:head>
  <title>Asset Scanner — Admin Panel</title>
</svelte:head>

<div class="scanner fade-in">
  <!-- Header -->
  <div class="page-header">
    <p class="text-mono-label page-label">CDN Discovery</p>
    <h1 class="page-title">Asset Scanner</h1>
    <p class="page-desc">
      Scan the BNK48 CDN for product images and group assets.
    </p>
  </div>

  <!-- Scanner Controls (Dark Band) -->
  <div class="dark-band scanner-controls">
    <div class="controls-header">
      <h2
        class="text-feature-heading"
        style="color: var(--color-on-dark); margin: 0;"
      >
        <i class="fa-solid fa-panorama" style="margin-right: 8px; opacity: 0.7;"
        ></i>
        Start Scan
      </h2>
    </div>

    <div class="controls-form">
      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label
            class="form-label"
            for="scan-type"
            style="color: rgba(255,255,255,0.6);">Asset Type</label
          >
          <select
            id="scan-type"
            class="form-input form-input-dark"
            bind:value={scanType}
          >
            <option value="product">Product</option>
            <option value="group">Group</option>
          </select>
        </div>
        <div class="form-group" style="flex: 2;">
          <label
            class="form-label"
            for="scan-secret"
            style="color: rgba(255,255,255,0.6);">Scan Secret</label
          >
          <input
            id="scan-secret"
            type="password"
            class="form-input form-input-dark"
            placeholder="Enter scan secret key..."
            bind:value={scanSecret}
          />
        </div>
        <div class="form-group">
          <label
            class="form-label"
            for="scan-submit"
            style="color: rgba(255,255,255,0.6);">Action</label
          >
          <button
            class="btn btn-primary"
            onclick={handleStartScan}
            disabled={scanning}
            style="background: var(--color-on-dark); color: var(--color-primary);"
          >
            {#if scanning}
              <i class="fa-solid fa-spinner fa-spin"></i>
            {:else}
              <i class="fa-solid fa-play"></i>
            {/if}
            Start Scan
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Error / Success -->
  {#if error}
    <div class="error-banner fade-in">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{error}</span>
      <button
        class="btn-icon"
        onclick={() => (error = "")}
        aria-label="Dismiss error"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/if}

  {#if success}
    <div class="success-banner fade-in">
      <i class="fa-solid fa-circle-check"></i>
      <span>{success}</span>
      <button
        class="btn-icon"
        onclick={() => (success = "")}
        style="color: var(--color-success);"
        aria-label="Dismiss success"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/if}

  <!-- Live Status -->
  {#if scanStatus}
    <section class="status-section fade-in">
      <h2 class="text-feature-heading section-title">
        Scan Progress
        <span
          class="chip"
          class:chip-processing={scanStatus.status === "running"}
          class:chip-completed={scanStatus.status === "done"}
          class:chip-failed={scanStatus.status === "error"}
          style="margin-left: 12px;"
        >
          <span class="chip-dot" class:pulse={scanStatus.status === "running"}
          ></span>
          {scanStatus.status}
        </span>
      </h2>

      <div class="card" style="margin-top: 16px;">
        <div class="status-grid">
          <div class="status-item">
            <span class="text-mono-label">Type</span>
            <span class="status-val">{scanStatus.type || scanType}</span>
          </div>
          <div class="status-item">
            <span class="text-mono-label">Scanned</span>
            <span class="status-val">{scanStatus.scanned_count ?? "—"}</span>
          </div>
          <div class="status-item">
            <span class="text-mono-label">Found</span>
            <span class="status-val" style="color: var(--color-success);"
              >{scanStatus.found_count ?? "—"}</span
            >
          </div>
          <div class="status-item">
            <span class="text-mono-label">Started</span>
            <span class="status-val"
              >{scanStatus.created_at
                ? new Date(scanStatus.created_at).toLocaleString()
                : "—"}</span
            >
          </div>
          {#if scanStatus.finished_at}
            <div class="status-item">
              <span class="text-mono-label">Finished</span>
              <span class="status-val"
                >{new Date(scanStatus.finished_at).toLocaleString()}</span
              >
            </div>
          {/if}
        </div>

        {#if scanStatus.status === "running" && scanStatus.scanned_count != null}
          <div style="margin-top: 20px;">
            <div class="progress-bar">
              <div
                class="progress-fill processing"
                style="width: {Math.min(
                  99,
                  Math.round((scanStatus.scanned_count / 1000) * 100),
                )}%;"
              ></div>
            </div>
            <p
              class="text-micro"
              style="color: var(--color-muted); margin-top: 8px; text-align: right;"
            >
              Scanning... {scanStatus.scanned_count} checked
            </p>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Discovered Assets Section -->
  <section class="assets-section">
    <div
      style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;"
    >
      <h2 class="text-feature-heading section-title" style="margin: 0;">
        Discovered {scanType === "product" ? "Products" : "Groups"}
        {#if latestId}
          <span
            style="font-size: 14px; font-weight: normal; color: var(--color-muted); margin-left: 8px;"
          >
            (Latest ID: #{latestId})
          </span>
        {/if}
      </h2>
      <div style="display: flex; gap: 8px; align-items: center;">
        <select
          bind:value={sortOrder}
          class="form-input"
          style="padding: 4px 8px; font-size: 13px; height: 32px; width: 140px; border-radius: var(--radius-sm); border: 1px solid var(--color-hairline); background: var(--color-canvas); color: var(--color-ink);"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        <button
          class="btn btn-pill-outline btn-sm"
          onclick={loadDiscoveredAssets}
          disabled={loadingAssets}
        >
          {#if loadingAssets}
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i>
          {:else}
            <i class="fa-solid fa-refresh" style="margin-right: 6px;"></i>
          {/if}
          Refresh List
        </button>
      </div>
    </div>

    {#if loadingAssets && discoveredAssets.length === 0}
      <div class="loading-grid">
        {#each Array(6) as _}
          <div class="card" style="padding: 16px;">
            <div
              class="skeleton"
              style="width: 100%; height: 140px; border-radius: var(--radius-sm); margin-bottom: 12px;"
            ></div>
            <div
              class="skeleton"
              style="width: 60%; height: 16px; margin-bottom: 8px;"
            ></div>
            <div class="skeleton" style="width: 40%; height: 12px;"></div>
          </div>
        {/each}
      </div>
    {:else if discoveredAssets.length === 0}
      <div class="empty-state" style="padding: 40px;">
        <i
          class="fa-solid fa-image"
          style="font-size: 32px; color: var(--color-muted); margin-bottom: 12px;"
        ></i>
        <p>No discovered assets found for this type.</p>
      </div>
    {:else}
      <div class="assets-grid">
        {#each discoveredAssets as asset}
          <div
            class="asset-card card fade-in"
            onclick={() => showAssetDetail(asset)}
            style="cursor: pointer;"
            role="presentation"
          >
            <div class="asset-thumb-wrap">
              {#if asset.url}
                <img
                  src={asset.url}
                  alt="ID {asset.id}"
                  class="asset-thumb"
                  loading="lazy"
                />
              {:else}
                <div class="asset-thumb asset-thumb-placeholder">
                  <i class="fa-solid fa-image"></i>
                </div>
              {/if}
            </div>
            <div class="asset-info">
              <div class="asset-id-row">
                <span class="asset-id">ID: #{asset.id}</span>
                {#if asset.extra_skus && asset.extra_skus.length > 0}
                  <span class="chip chip-completed"
                    >{asset.extra_skus.length} SKUs</span
                  >
                {/if}
              </div>
              {#if asset.title}
                <h3 class="asset-title truncate" title={asset.title}>
                  {asset.title}
                </h3>
              {/if}
              {#if asset.description}
                <p class="asset-desc truncate" title={asset.description}>
                  {asset.description}
                </p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Load More -->
      {#if discoveredAssets.length > 0 && hasMoreAssets}
        <div class="load-more-container" style="display: flex; justify-content: center; margin-top: 24px;">
          <button
            class="btn btn-pill-outline btn-sm"
            onclick={loadMoreAssets}
            disabled={loadingMoreAssets}
            style="min-width: 140px;"
          >
            {#if loadingMoreAssets}
              <i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> Loading...
            {:else}
              Load More
            {/if}
          </button>
        </div>
      {/if}
    {/if}
  </section>

  <!-- Scan History -->
  {#if scanHistory.length > 0}
    <section class="history-section">
      <h2 class="text-feature-heading section-title">Session History</h2>
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Log ID</th>
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
                <td
                  ><code style="font-family: var(--font-mono); font-size: 13px;"
                    >#{entry.id}</code
                  ></td
                >
                <td><span class="chip chip-queued">{entry.type}</span></td>
                <td class="cell-muted">{entry.startId}–{entry.endId}</td>
                <td>
                  <span
                    class="chip"
                    class:chip-processing={entry.status === "running"}
                    class:chip-completed={entry.status === "done"}
                    class:chip-failed={entry.status === "error"}
                  >
                    <span
                      class="chip-dot"
                      class:pulse={entry.status === "running"}
                    ></span>
                    {entry.status}
                  </span>
                </td>
                <td class="cell-muted">{entry.time}</td>
                <td>
                  <button
                    class="btn btn-pill-outline btn-sm"
                    onclick={() => checkStatus(entry.id)}
                  >
                    <i class="fa-solid fa-refresh"></i> Check
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Empty State -->
  {#if !scanStatus && scanHistory.length === 0}
    <div class="empty-state">
      <i class="fa-solid fa-panorama"></i>
      <p>Configure the scanner above and start a CDN asset discovery scan.</p>
    </div>
  {/if}
  <!-- Modal Popup for Discovered Asset Detail -->
  {#if selectedAsset}
    <div
      class="modal-backdrop fade-in"
      onclick={() => (selectedAsset = null)}
      role="presentation"
    >
      <div
        class="modal-content card card-stone fade-in-scale"
        onclick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div class="modal-header">
          <h2 class="text-feature-heading" style="margin: 0;">
            {scanType === "product" ? "Product Details" : "Group Details"}
          </h2>
          <button
            class="btn-icon"
            onclick={() => (selectedAsset = null)}
            aria-label="Close details"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="modal-media">
            {#if loadingAssetDetail}
              <div class="modal-thumb-placeholder">
                <i class="fa-solid fa-spinner fa-spin"></i>
              </div>
            {:else if assetUrls.length > 0}
              <div class="modal-image-slider">
                {#each assetUrls as imgUrl}
                  <img
                    src={imgUrl}
                    alt="Asset {selectedAsset.id}"
                    class="modal-thumb slider-img"
                  />
                {/each}
              </div>
            {:else if selectedAsset.url}
              <img
                src={selectedAsset.url}
                alt="ID {selectedAsset.id}"
                class="modal-thumb"
              />
            {:else}
              <div class="modal-thumb-placeholder">
                <i class="fa-solid fa-image"></i>
              </div>
            {/if}

            <div
              style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;"
            >
              {#if assetUrls.length > 0}
                <div
                  style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; border-bottom: 1px solid var(--color-card-border);"
                  class="thumbnail-indicator-row"
                >
                  {#each assetUrls as imgUrl, idx}
                    <button
                      class="thumb-indicator-btn"
                      onclick={(e) => {
                        const slider = e.currentTarget
                          .closest(".modal-media")
                          ?.querySelector(".modal-image-slider");
                        if (slider) {
                          const imgElements =
                            slider.querySelectorAll(".slider-img");
                          if (imgElements[idx]) {
                            imgElements[idx].scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                              inline: "start",
                            });
                          }
                        }
                      }}
                      style="border: none; background: none; padding: 0; cursor: pointer; flex-shrink: 0;"
                      aria-label="View image {idx + 1}"
                    >
                      <img
                        src={imgUrl}
                        alt="thumb"
                        style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-xs); border: 2px solid var(--color-hairline);"
                      />
                    </button>
                  {/each}
                </div>
              {/if}

              {#if selectedAsset.url}
                <a
                  href={selectedAsset.url}
                  target="_blank"
                  rel="noopener"
                  class="btn btn-pill-outline btn-sm"
                  style="flex: 1; text-align: center; text-decoration: none;"
                >
                  <i
                    class="fa-solid fa-up-right-from-square"
                    style="margin-right: 6px;"
                  ></i> Open Original Image
                </a>
              {/if}
            </div>
          </div>

          <div class="modal-info-panel">
            {#if selectedAsset.title}
              <div class="detail-section">
                <span
                  class="text-mono-label"
                  style="display: block; margin-bottom: 4px;">Title</span
                >
                <p class="text-body" style="margin: 0; font-weight: 500;">
                  {selectedAsset.title}
                </p>
              </div>
            {/if}

            {#if selectedAsset.description}
              <div class="detail-section">
                <span
                  class="text-mono-label"
                  style="display: block; margin-bottom: 4px;">Description</span
                >
                <p
                  class="text-body"
                  style="margin: 0; color: var(--color-body-muted);"
                >
                  {selectedAsset.description}
                </p>
              </div>
            {/if}

            <div class="detail-section">
              <span
                class="text-mono-label"
                style="margin-bottom: 6px; display: block;"
                >SKUs Discovered</span
              >
              {#if loadingAssetDetail}
                <div class="skeleton" style="width: 120px; height: 28px;"></div>
              {:else if assetSkus.length === 0}
                <p
                  class="text-caption"
                  style="margin: 0; color: var(--color-muted);"
                >
                  No SKUs found.
                </p>
              {:else}
                <div
                  class="member-tags"
                  style="display: flex; gap: 6px; flex-wrap: wrap;"
                >
                  {#each assetSkus as sku}
                    <span class="chip chip-completed">SKU {sku}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .scanner {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .page-header {
    padding-bottom: var(--space-xs);
  }

  /* ── Controls ───────────────────────────────────────────────────────── */
  .scanner-controls {
    padding: 32px;
  }

  .controls-header {
    margin-bottom: 24px;
  }

  .controls-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-row {
    display: flex;
    gap: 16px;
  }

  /* ── Banners ────────────────────────────────────────────────────────── */
  .success-banner {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-lg);
    color: var(--color-ink);
    font-size: 14px;
  }
  .success-banner .btn-icon {
    margin-left: auto;
  }

  /* ── Status ─────────────────────────────────────────────────────────── */
  .section-title {
    display: flex;
    align-items: center;
    margin-bottom: 0;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 20px;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .status-val {
    font-family: var(--font-body);
    font-size: 20px;
    font-weight: 400;
    letter-spacing: -0.3px;
    color: var(--color-ink);
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  .asset-card {
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-none);
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .asset-card:hover {
    border-color: var(--color-hairline-soft);
  }

  .asset-thumb-wrap {
    position: relative;
    aspect-ratio: 1 / 1;
    width: 100%;
    background: var(--color-surface-cool);
    overflow: hidden;
  }

  .asset-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .asset-thumb-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font-size: 24px;
  }

  .asset-info {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .asset-id-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .asset-id {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .asset-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink);
    margin: 0;
  }

  .asset-desc {
    font-size: 12px;
    color: var(--color-body-muted);
    margin: 0;
  }

  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .form-row {
      flex-direction: column;
    }
  }
  /* ── Modal Popup Styles ────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 3, 3, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-lg);
    animation: fade-in 0.2s var(--ease-out);
  }

  .modal-content {
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-none);
    padding: var(--space-xl);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-card-border);
    padding-bottom: 16px;
  }

  .modal-body {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 28px;
  }

  .modal-media {
    width: 100%;
  }

  .modal-thumb {
    width: 100%;
    border-radius: var(--radius-sm);
    object-fit: cover;
    display: block;
    aspect-ratio: 1 / 1;
  }

  .modal-thumb-placeholder {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-sm);
    background: var(--color-soft-stone);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font-size: 48px;
  }

  .modal-info-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-section .text-body {
    display: flex;
    max-height: 300px;
    overflow-y: scroll;
  }

  .detail-section .text-body::-webkit-scrollbar {
    width: 6px;
  }
  .detail-section .text-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .detail-section .text-body::-webkit-scrollbar-thumb {
    background: var(--color-hairline);
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    .modal-body {
      grid-template-columns: 1fr;
    }
    .modal-content {
      padding: 20px;
      max-height: 95vh;
    }
  }

  .modal-image-slider {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    width: 100%;
    border-radius: var(--radius-sm);
  }

  .modal-image-slider::-webkit-scrollbar {
    height: 6px;
  }
  .modal-image-slider::-webkit-scrollbar-track {
    background: transparent;
  }
  .modal-image-slider::-webkit-scrollbar-thumb {
    background: var(--color-hairline);
    border-radius: 3px;
  }

  .slider-img {
    flex: 0 0 100%;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    scroll-snap-align: start;
    border-radius: var(--radius-sm);
  }

  .thumbnail-indicator-row::-webkit-scrollbar {
    height: 4px;
  }
  .thumbnail-indicator-row::-webkit-scrollbar-track {
    background: transparent;
  }
  .thumbnail-indicator-row::-webkit-scrollbar-thumb {
    background: var(--color-hairline);
    border-radius: 2px;
  }

  .thumb-indicator-btn:hover img {
    border-color: var(--color-ink) !important;
  }

  .fade-in-scale {
    animation: fade-in-scale 0.25s var(--ease-out);
  }

  @keyframes fade-in-scale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
