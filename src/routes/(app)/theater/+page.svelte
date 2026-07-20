<script lang="ts">
  import {
    getPlaybackArchive,
    getTheaterArchive,
    getTheaterTicketBooking,
    startDownload,
    getVOD,
  } from "$lib/api";
  import type { ArchiveItem } from "$lib/api";

  // ── State ────────────────────────────────────────────────────────────────
  let activeTab = $state<"playback" | "performance" | "tickets">("playback");
  let loading = $state(false);
  let error = $state("");

  let items = $state<ArchiveItem[]>([]);
  let total = $state(0);
  let pageSize = $state(20);

  let expandedId = $state<string | null>(null);
  let selectedItem = $derived(items.find((i) => i.id === expandedId) || null);
  let vodLoading = $state("");
  let downloadStarted = $state<Record<string, boolean>>({});

  // ── Fetch ────────────────────────────────────────────────────────────────
  let loadingMore = $state(false);

  async function fetchInitialData() {
    loading = true;
    error = "";
    items = [];

    try {
      const data =
        activeTab === "playback"
          ? await getPlaybackArchive(0, pageSize)
          : activeTab === "performance"
            ? await getTheaterArchive(0, pageSize)
            : await getTheaterTicketBooking(0, pageSize);

      items = data.items;
      total = data.total;
    } catch (e: any) {
      error = e.message || "Failed to load archive";
    } finally {
      loading = false;
    }
  }

  async function loadMore() {
    if (loadingMore || items.length >= total) return;
    loadingMore = true;
    error = "";

    try {
      const skip = items.length;
      const data =
        activeTab === "playback"
          ? await getPlaybackArchive(skip, pageSize)
          : activeTab === "performance"
            ? await getTheaterArchive(skip, pageSize)
            : await getTheaterTicketBooking(skip, pageSize);

      const newItems = data.items.filter(
        (newItem) => !items.some((existing) => existing.id === newItem.id),
      );
      items = [...items, ...newItems];
      total = data.total;
    } catch (e: any) {
      error = e.message || "Failed to load archive";
    } finally {
      loadingMore = false;
    }
  }

  // Initial load
  $effect(() => {
    // Re-fetch when tab changes
    activeTab;
    fetchInitialData();
  });

  function switchTab(tab: "playback" | "performance" | "tickets") {
    if (activeTab === tab) return;
    activeTab = tab;
    expandedId = null;
  }

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  async function handleDownloadVOD(item: ArchiveItem) {
    vodLoading = item.id;
    try {
      const data = await getVOD(item.id);
      if (data.vod?.resourceUrl) {
        await startDownload(
          data.vod.resourceUrl,
          data.vod.fileName || item.title,
        );
        downloadStarted[item.id] = true;
      }
    } catch (e: any) {
      error = e.message || "Download failed";
    } finally {
      vodLoading = "";
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }
</script>

<svelte:head>
  <title>Theater Archive — Admin Panel</title>
</svelte:head>

<div class="theater fade-in">
  <!-- Header -->
  <div class="page-header">
    <p class="text-mono-label page-label">Media Library</p>
    <h1 class="page-title">Theater Archive</h1>
    <p class="page-desc">
      Browse playback recordings and theater performance archives.
    </p>
  </div>

  <!-- Tab Switcher -->
  <div class="tab-bar">
    <button
      class="btn btn-coral"
      class:active={activeTab === "playback"}
      onclick={() => switchTab("playback")}
    >
      <i class="fa-solid fa-play-circle"></i> Playback
    </button>
    <button
      class="btn btn-coral"
      class:active={activeTab === "performance"}
      onclick={() => switchTab("performance")}
    >
      <i class="fa-solid fa-masks-theater"></i> Performance
    </button>

    <div class="tab-spacer"></div>

    <span class="text-caption" style="color: var(--color-muted);">
      {total} total items
    </span>
  </div>

  <!-- Error -->
  {#if error}
    <div class="error-banner fade-in">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{error}</span>
      <button
        class="btn-icon"
        aria-label="Dismiss error"
        onclick={() => (error = "")}
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/if}

  <!-- Loading -->
  {#if loading}
    <div class="loading-grid">
      {#each Array(6) as _}
        <div class="card" style="padding: 20px;">
          <div
            class="skeleton"
            style="width: 100%; height: 120px; margin-bottom: 12px;"
          ></div>
          <div
            class="skeleton"
            style="width: 70%; height: 18px; margin-bottom: 8px;"
          ></div>
          <div class="skeleton" style="width: 40%; height: 14px;"></div>
        </div>
      {/each}
    </div>
  {:else if items.length === 0}
    <div class="empty-state">
      <i class="fa-solid fa-film"></i>
      <p>No archive items found.</p>
    </div>
  {:else}
    <!-- Results Grid -->
    <div class="archive-grid">
      {#each items as item (item.id)}
        <div
          class="archive-card card fade-in"
          class:expanded={expandedId === item.id}
        >
          <!-- Thumbnail -->
          <div
            class="archive-thumb-wrap"
            role="button"
            tabindex="0"
            onclick={() => toggleExpand(item.id)}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleExpand(item.id);
              }
            }}
          >
            {#if item.url}
              <img src={item.url} alt={item.title} class="archive-thumb" />
            {:else}
              <div class="archive-thumb archive-thumb-placeholder">
                <i class="fa-solid fa-film"></i>
              </div>
            {/if}
            <div class="archive-overlay">
              <i class="fa-solid fa-expand"></i>
            </div>
          </div>

          <!-- Info -->
          <div class="archive-info">
            <h3 class="archive-title truncate">{item.title}</h3>
            <div class="archive-meta">
              <span class="text-caption" style="color: var(--color-muted);">
                <i class="fa-regular fa-calendar"></i>
                {formatDate(item.date)}
              </span>
              {#if item.time}
                <span class="text-caption" style="color: var(--color-muted);">
                  <i class="fa-regular fa-clock"></i>
                  {item.time}
                </span>
              {/if}
            </div>

            {#if item.placeName}
              <p
                class="text-micro"
                style="color: var(--color-slate); margin-top: 4px;"
              >
                <i class="fa-solid fa-location-dot"></i>
                {item.placeName}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Load More -->
    {#if items.length < total}
      <div
        class="load-more-container"
        style="display: flex; justify-content: center; margin-top: 24px;"
      >
        <button
          class="btn btn-pill-outline btn-sm"
          onclick={loadMore}
          disabled={loadingMore}
          style="min-width: 140px;"
        >
          {#if loadingMore}
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"
            ></i> Loading...
          {:else}
            Load More ({items.length} / {total})
          {/if}
        </button>
      </div>
    {/if}
  {/if}

  <!-- Modal Popup -->
  {#if selectedItem}
    <div
      class="modal-backdrop fade-in"
      onclick={() => (expandedId = null)}
      role="presentation"
    >
      <div
        class="modal-content card card-stone fade-in-scale"
        onclick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div class="modal-header">
          <h2 class="text-feature-heading" style="margin: 0;">
            Archive Details
          </h2>
          <button
            class="btn-icon"
            onclick={() => (expandedId = null)}
            aria-label="Close details"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="modal-media">
            {#if selectedItem.url}
              <img
                src={selectedItem.url}
                alt={selectedItem.title}
                class="modal-thumb"
              />
            {:else}
              <div class="modal-thumb-placeholder">
                <i class="fa-solid fa-film"></i>
              </div>
            {/if}
          </div>

          <div class="modal-info-panel">
            <h3 class="modal-title">{selectedItem.title}</h3>

            <div class="modal-meta-grid">
              <div class="modal-meta-item">
                <span class="text-mono-label">Date :</span>
                <span
                  ><i class="fa-regular fa-calendar" style="margin-right: 6px;"
                  ></i>
                  {formatDate(selectedItem.date)}</span
                >
              </div>
              {#if selectedItem.time}
                <div class="modal-meta-item">
                  <span class="text-mono-label">Time :</span>
                  <span
                    ><i class="fa-regular fa-clock" style="margin-right: 6px;"
                    ></i>
                    {selectedItem.time}</span
                  >
                </div>
              {/if}
              {#if selectedItem.placeName}
                <div class="modal-meta-item">
                  <span class="text-mono-label">Place :</span>
                  <span
                    ><i
                      class="fa-solid fa-location-dot"
                      style="margin-right: 6px;"
                    ></i>
                    {selectedItem.placeName}</span
                  >
                </div>
              {/if}
            </div>

            {#if selectedItem.description}
              <div class="modal-description">
                <span
                  class="text-mono-label"
                  style="display: block; margin-bottom: 6px;">Description</span
                >
                <p
                  class="text-body"
                  style="margin: 0; color: var(--color-body-muted);"
                >
                  {selectedItem.description}
                </p>
              </div>
            {/if}

            {#if selectedItem.memberNames?.length > 0}
              <div class="modal-members">
                <span
                  class="text-mono-label"
                  style="display: block; margin-bottom: 8px;"
                  >Performing Members</span
                >
                <div class="member-tags">
                  {#each selectedItem.memberNames as name}
                    <span class="chip chip-queued">{name}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .theater {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .page-header {
    padding-bottom: var(--space-xs);
  }

  /* ── Tab Bar ────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tab-spacer {
    flex: 1;
  }

  /* ── Error ──────────────────────────────────────────────────────────── */
  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  /* ── Grid ───────────────────────────────────────────────────────────── */
  .archive-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .archive-card {
    padding: 0;
    overflow: hidden;
    cursor: default;
  }

  .archive-thumb-wrap {
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }

  .archive-thumb {
    width: 100%;
    object-fit: cover;
    display: block;
  }

  .archive-thumb-placeholder {
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-cool);
    color: var(--color-stone);
    font-size: 32px;
  }

  .archive-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  .archive-thumb-wrap:hover .archive-overlay {
    opacity: 1;
  }

  .archive-info {
    padding: 16px 10px;
  }

  .archive-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-ink);
    margin-bottom: 8px;
  }

  .archive-meta {
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
    flex-direction: column;
  }

  .archive-meta i {
    margin-right: 4px;
    font-size: 12px;
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
    grid-template-columns: 1.2fr 1.8fr;
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
    aspect-ratio: 3 / 4;
  }

  .modal-thumb-placeholder {
    width: 100%;
    aspect-ratio: 3 / 4;
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
  }

  .modal-title {
    font-family: var(--font-body);
    font-size: 24px;
    font-weight: 400;
    margin: 0;
    color: var(--color-ink);
  }

  .modal-meta-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    background: var(--color-soft-stone);
    padding: 10px;
    border-radius: var(--radius-sm);
  }

  .modal-meta-item {
    display: flex;
    gap: 4px;
  }

  .modal-meta-item span:last-child {
    font-size: 14px;
    color: var(--color-ink);
  }

  .member-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .modal-description {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 340px;
    overflow-y: auto;
    padding-right: 8px;
  }

  .modal-description p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-body-muted);
  }

  @media (max-width: 768px) {
    .modal-body {
      grid-template-columns: 1fr;
    }
    .modal-content {
      padding: 20px;
      max-height: 95vh;
    }
    .modal-thumb-placeholder {
      aspect-ratio: 16 / 9;
    }
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
