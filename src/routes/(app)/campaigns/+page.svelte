<script lang="ts">
  import { onMount } from "svelte";
  import { getLatestAsset, checkAssets } from "$lib/api";

  // ── State ────────────────────────────────────────────────────────────────
  let campaigns = $state<any[]>([]);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state("");
  let latestId = $state<number | null>(null);
  let sortOrder = $state<"asc" | "desc">("desc");
  let hasMore = $state(true);

  // Detail Modal State
  let selectedCampaign = $state<any | null>(null);

  // ── Fetch Campaigns ──────────────────────────────────────────────────────
  async function loadCampaigns() {
    loading = true;
    hasMore = true;
    error = "";
    try {
      // ดึง ID ล่าสุดของแคมเปญ
      const latest = await getLatestAsset("campaign");
      if (latest && latest.id && latest.id !== "0") {
        const startId = parseInt(latest.id);
        latestId = startId;

        const initialStart = sortOrder === "desc" ? startId : 1;
        const data = await checkAssets("campaign", initialStart, 24, sortOrder);
        campaigns = data;
        hasMore = data.length > 0;
      } else {
        campaigns = [];
        latestId = null;
      }
    } catch (e: any) {
      console.error("Failed to load campaigns:", e);
      error = e.message || "Failed to load campaigns";
    } finally {
      loading = false;
    }
  }

  async function loadMoreCampaigns() {
    if (loadingMore || campaigns.length === 0) return;
    loadingMore = true;
    error = "";
    try {
      const lastCampaign = campaigns[campaigns.length - 1];
      const lastIdNum = parseInt(lastCampaign.id);

      let data: any[] = [];
      if (sortOrder === "desc") {
        const nextStartId = lastIdNum - 1;
        if (nextStartId > 0) {
          data = await checkAssets("campaign", nextStartId, 24, "desc");
        }
      } else {
        const nextStartId = lastIdNum + 1;
        if (latestId && nextStartId <= latestId) {
          data = await checkAssets("campaign", nextStartId, 24, "asc");
        }
      }

      if (data.length > 0) {
        const newCampaigns = data.filter(
          (newCamp) =>
            !campaigns.some((existing) => existing.id === newCamp.id),
        );
        if (newCampaigns.length > 0) {
          campaigns = [...campaigns, ...newCampaigns];
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (e: any) {
      console.error("Failed to load more campaigns:", e);
      error = e.message || "Failed to load more campaigns";
    } finally {
      loadingMore = false;
    }
  }

  // Reload when sortOrder changes
  $effect(() => {
    sortOrder;
    loadCampaigns();
  });
</script>

<svelte:head>
  <title>Campaigns — Admin Panel</title>
</svelte:head>

<div class="campaigns-page fade-in">
  <!-- Header -->
  <div class="page-header">
    <p class="text-mono-label page-label">Asset Discovery</p>
    <h1 class="page-title">BNK48 Campaigns</h1>
    <p class="page-desc">
      Browse and inspect official BNK48 campaigns details and progress.
    </p>
  </div>

  <!-- Filters Row -->
  <div class="filter-row card">
    <div class="filter-inner">
      <div class="filter-info">
        <i class="ti ti-flag text-coral" style="margin-right: 8px;"></i>
        <span>Sort campaigns by ID sequence:</span>
      </div>
      <div class="filter-actions">
        <select
          class="form-input"
          bind:value={sortOrder}
          style="width: 160px; height: 36px; padding: 0 12px;"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        <button
          class="btn btn-pill-outline btn-sm"
          onclick={loadCampaigns}
          disabled={loading}
        >
          <i class="ti ti-refresh" style="margin-right: 6px;"></i> Refresh
        </button>
      </div>
    </div>
  </div>

  <!-- Error Banner -->
  {#if error}
    <div class="error-banner fade-in">
      <i class="ti ti-alert-circle"></i>
      <span>{error}</span>
      <button
        class="btn-icon"
        onclick={() => (error = "")}
        aria-label="Dismiss error"
      >
        <i class="ti ti-x"></i>
      </button>
    </div>
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="loading-state">
      <i class="ti ti-loader ti-spin ti-lg text-coral"></i>
      <p style="margin-top: 12px; color: var(--color-muted);">
        Loading campaigns from BNK48 API...
      </p>
    </div>
  {:else if campaigns.length === 0}
    <!-- Empty State -->
    <div class="empty-state card">
      <i class="ti ti-flag-checkered"></i>
      <p>No campaigns found.</p>
    </div>
  {:else}
    <!-- Campaigns Grid -->
    <div class="campaigns-grid">
      {#each campaigns as camp}
        <button
          class="campaign-card card"
          onclick={() => (selectedCampaign = camp)}
        >
          <div class="card-image-wrap">
            {#if camp.url}
              <img
                src={camp.url}
                alt={camp.title}
                class="card-image"
                loading="lazy"
              />
            {:else}
              <div class="card-image-placeholder">
                <i class="ti ti-flag ti-lg"></i>
              </div>
            {/if}
            <span class="campaign-id-badge">ID: {camp.id}</span>
          </div>
          <div class="card-content">
            <h3 class="campaign-title truncate" title={camp.title}>
              {camp.title || "Untitled Campaign"}
            </h3>

            {#if camp.displayTextLine1}
              <p class="display-text-p line1 truncate">
                {camp.displayTextLine1}
              </p>
            {/if}
            {#if camp.displayTextLine2}
              <p class="display-text-p line2 truncate">
                {camp.displayTextLine2}
              </p>
            {/if}

            <!-- Progress Bar -->
            <div class="progress-container">
              <div class="progress-bar-label">
                <span>Progress</span>
                <span class="text-coral">{camp.progressPercentage}%</span>
              </div>
              <div class="progress-bar-track">
                <div
                  class="progress-bar-fill"
                  style="width: {Math.min(100, camp.progressPercentage)}%"
                ></div>
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>

    <!-- Load More Button -->
    {#if hasMore}
      <div class="load-more-wrap">
        <button
          class="btn btn-primary"
          onclick={loadMoreCampaigns}
          disabled={loadingMore}
        >
          {#if loadingMore}
            <i class="ti ti-loader ti-spin" style="margin-right: 6px;"
            ></i> Loading...
          {:else}
            <i class="ti ti-arrow-down" style="margin-right: 6px;"></i> Load
            More Campaigns
          {/if}
        </button>
      </div>
    {/if}
  {/if}

  <!-- Campaign Detail Modal -->
  {#if selectedCampaign}
    <div
      class="modal-backdrop"
      onclick={(e) => {
        if (e.target === e.currentTarget) selectedCampaign = null;
      }}
      onkeydown={(e) => {
        if (e.key === "Escape" || e.key === "Enter") selectedCampaign = null;
      }}
      role="button"
      tabindex="0"
      aria-label="Close modal"
    >
      <div class="modal-content card fade-in">
        <div class="modal-header">
          <h2 class="text-feature-heading" style="margin: 0;">
            Campaign Details (ID: {selectedCampaign.id})
          </h2>
          <button
            class="btn-icon"
            onclick={() => (selectedCampaign = null)}
            aria-label="Close details"
          >
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="modal-body">
          {#if selectedCampaign.url}
            <img
              src={selectedCampaign.url}
              alt={selectedCampaign.title}
              class="modal-cover"
            />
          {/if}

          <div class="modal-info-block">
            <h3 class="modal-title-text">{selectedCampaign.title}</h3>

            {#if selectedCampaign.displayTextLine1}
              <p class="modal-display-line text-coral">
                <strong>Line 1:</strong>
                {selectedCampaign.displayTextLine1}
              </p>
            {/if}
            {#if selectedCampaign.displayTextLine2}
              <p class="modal-display-line text-muted">
                <strong>Line 2:</strong>
                {selectedCampaign.displayTextLine2}
              </p>
            {/if}

            <div class="progress-detail">
              <div class="progress-bar-label">
                <strong>Fundraising Progress</strong>
                <strong class="text-coral" style="font-size: 16px;"
                  >{selectedCampaign.progressPercentage}%</strong
                >
              </div>
              <div class="progress-bar-track large">
                <div
                  class="progress-bar-fill"
                  style="width: {Math.min(
                    100,
                    selectedCampaign.progressPercentage,
                  )}%"
                ></div>
              </div>
            </div>

            {#if selectedCampaign.description}
              <div class="modal-description">
                <strong>Description:</strong>
                <p class="description-text">{selectedCampaign.description}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .campaigns-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-bottom: 40px;
  }

  .page-header {
    padding-bottom: var(--space-xs);
  }

  .text-coral {
    color: var(--ink);
  }

  .filter-row {
    padding: 16px 24px;
  }

  .filter-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .filter-info {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: var(--color-body-muted);
  }

  .filter-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .text-coral {
    color: var(--ink);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: var(--color-muted);
  }

  .empty-state i {
    font-size: 48px;
    margin-bottom: 16px;
  }

  /* Campaigns Grid */
  .campaigns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .campaign-card {
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out);
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 16px;
  }

  .campaign-card:hover {
    border-color: var(--color-hairline-soft);
  }

  .card-image-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    background: var(--card);
    overflow: hidden;
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
  }

  .campaign-id-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: var(--color-footer);
    color: var(--color-on-primary);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
  }

  .card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .campaign-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--ink);
    margin: 0;
  }

  .display-text-p {
    font-size: 13px;
    margin: 0;
  }

  .display-text-p.line1 {
    color: var(--ink);
    font-weight: 600;
  }

  .display-text-p.line2 {
    color: var(--ink);
  }

  /* Progress Bar */
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }

  .progress-bar-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--color-muted);
    font-weight: 500;
  }

  .progress-bar-track {
    height: 6px;
    background: var(--color-soft-stone);
    border-radius: 10px;
    overflow: hidden;
  }

  .progress-bar-track.large {
    height: 10px;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--ink);
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .load-more-wrap {
    display: flex;
    justify-content: center;
    margin-top: 12px;
  }

  /* Modal Details */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(3, 3, 3, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-lg);
    border: none;
    text-align: left;
  }

  .modal-content {
    background: var(--white);
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 0;
    cursor: default;
    border: 1px solid var(--border);
    border-radius: 16px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-card-border);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
  }

  .modal-cover {
    width: 100%;
    max-height: 320px;
    object-fit: cover;
    background: var(--color-soft-stone);
  }

  .modal-info-block {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-title-text {
    font-size: 20px;
    font-weight: 500;
    margin: 0;
    color: var(--ink);
    line-height: 1.3;
  }

  .modal-display-line {
    margin: 0;
    font-size: 14px;
  }

  .progress-detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: var(--color-soft-stone);
    border-radius: 8px;
  }

  .modal-description {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .description-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-body-muted);
    white-space: pre-wrap;
  }
</style>
