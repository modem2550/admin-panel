<script lang="ts">
  import type { PageData } from "./$types";
  import type { AuctionEvent, PollEvent } from "./+page.server";
  import { page } from "$app/stores";

  let { data }: { data: PageData } = $props();

  let auctions = $derived(data.auctions as AuctionEvent[]);
  let polls = $derived(data.polls as PollEvent[]);
  let loadError = $derived(data.error as string | null);

  let activeTab = $state<"auctions" | "polls">("auctions");
  let searchQuery = $state("");

  $effect(() => {
    const tab = $page.url.searchParams.get("tab");
    if (tab === "polls") activeTab = "polls";
  });

  let filteredAuctions = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    return auctions.filter((a) => {
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.tokenSymbol.toLowerCase().includes(q)
      );
    });
  });

  let filteredPolls = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    return polls.filter((p) => {
      if (!q) return true;
      return (
        p.pollName.toLowerCase().includes(q) ||
        p.question.toLowerCase().includes(q) ||
        p.tokenName.toLowerCase().includes(q)
      );
    });
  });

  function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function batchLabel(name: string): string {
    const match = name.match(/Batch\s+\d+/i);
    return match ? match[0] : name;
  }
</script>

<svelte:head>
  <title>Auctions & Polls — Admin Panel</title>
</svelte:head>

<div class="auctions-page fade-in">
  <div class="page-header">
    <div>
      <p class="text-mono-label page-label">iam48 API</p>
      <h1 class="page-title">Auctions & Polls</h1>
      <p class="page-desc">Browse IAM48 auction batches and poll results.</p>
    </div>
  </div>

  <div class="tabs-bar">
    <button
      class="btn btn-coral"
      class:active={activeTab === "auctions"}
      onclick={() => (activeTab = "auctions")}
    >
      <i class="ti ti-gavel"></i> Auctions
    </button>
    <button
      class="btn btn-coral"
      class:active={activeTab === "polls"}
      onclick={() => (activeTab = "polls")}
    >
      <i class="ti ti-square-poll-vertical"></i> Poll Posters
    </button>
    <div class="tab-spacer"></div>
  </div>

  <div class="controls-bar">
    <div class="search-wrap">
      <i class="ti ti-magnifying-glass search-icon"></i>
      <input
        id="auctions-search"
        class="form-input search-input"
        type="search"
        placeholder="Search..."
        bind:value={searchQuery}
      />
    </div>
    <span class="text-caption count-label">
      {#if activeTab === "auctions"}
        {filteredAuctions.length} / {auctions.length} batches
      {:else}
        {filteredPolls.length} / {polls.length} polls
      {/if}
    </span>
  </div>

  {#if loadError}
    <div class="error-banner">
      <i class="ti ti-alert-circle"></i>
      <span>{loadError}</span>
    </div>
  {/if}

  {#if activeTab === "auctions"}
    {#if auctions.length === 0 && !loadError}
      <div class="empty-state">
        <i class="ti ti-gavel"></i>
        <p>Loading auctions from API...</p>
        <div class="spinner"></div>
      </div>
    {:else if filteredAuctions.length === 0}
      <div class="empty-state">
        <i class="ti ti-filter-circle-xmark"></i>
        <p>No batches match your search.</p>
      </div>
    {:else}
      <div class="batches-grid">
        {#each filteredAuctions as auction (auction.id)}
          <a href="/auctions/{auction.id}" class="batch-card card">
            <div class="batch-thumb-wrap">
              {#if auction.image}
                <img
                  src={auction.image}
                  alt={auction.name}
                  class="batch-thumb"
                  loading="lazy"
                />
              {:else}
                <div class="batch-thumb batch-thumb-placeholder">
                  <i class="ti ti-image"></i>
                </div>
              {/if}
              <div class="batch-status-badge">
                <span class="chip chip-completed">{auction.eventStatus}</span>
              </div>
            </div>
            <div class="batch-info">
              <h3 class="batch-title">{auction.name}</h3>
              <div class="batch-meta">
                {#if auction.tokenSymbol}
                  <span class="meta-row">
                    <i class="ti ti-coins"></i>
                    {auction.tokenSymbol}
                  </span>
                {/if}
                <span class="meta-row">
                  <i class="ti ti-images"></i>
                  {auction.auctionItemCount} items
                </span>
                <span class="meta-row">
                  <i class="ti ti-calendar"></i>
                  {formatDate(auction.startDate)} – {formatDate(
                    auction.endDate,
                  )}
                </span>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {:else if polls.length === 0 && !loadError}
    <div class="empty-state">
      <i class="ti ti-square-poll-vertical"></i>
      <p>Loading polls from API...</p>
      <div class="spinner"></div>
    </div>
  {:else if filteredPolls.length === 0}
    <div class="empty-state">
      <i class="ti ti-filter-circle-xmark"></i>
      <p>No polls match your search.</p>
    </div>
  {:else}
    <div class="batches-grid">
      {#each filteredPolls as poll (poll.id)}
        <a href="/auctions/polls/{poll.id}" class="batch-card card">
          <div class="batch-thumb-wrap poll-thumb-wrap">
            {#if poll.coverPhotoUrl}
              <img
                src={poll.coverPhotoUrl}
                alt={poll.pollName}
                class="batch-thumb"
                loading="lazy"
              />
            {:else}
              <div class="batch-thumb batch-thumb-placeholder">
                <i class="ti ti-image"></i>
              </div>
            {/if}
            <div class="batch-status-badge">
              <span class="chip chip-completed">{poll.eventStatus}</span>
            </div>
          </div>
          <div class="batch-info">
            <h3 class="batch-title">{poll.question}</h3>
            <div class="batch-meta">
              {#if poll.tokenName}
                <span class="meta-row">
                  <i class="ti ti-fire"></i>
                  {poll.tokenName}
                </span>
              {/if}
              <span class="meta-row">
                <i class="ti ti-calendar"></i>
                {formatDate(poll.startDate)} – {formatDate(poll.endDate)}
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .auctions-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .tabs-bar {
    display: flex;
    gap: var(--space-xs);
    border-bottom: 1px solid var(--border);
    padding-bottom: var(--space-sm);
  }

  .tab-spacer {
    flex: 1;
  }

  .controls-bar {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 360px;
  }

  .search-icon {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-stone);
    font-size: 14px;
    pointer-events: none;
  }

  .search-input {
    padding-left: 28px !important;
    height: 40px;
    font-size: 14px;
  }

  .count-label {
    color: var(--color-stone);
    margin-left: auto;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--ink);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-top: var(--space-md);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .batches-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-lg);
  }

  .batch-card {
    padding: 0;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--white);
    box-shadow: none;
    transition:
      box-shadow var(--duration-normal) var(--ease-out),
      transform var(--duration-normal) var(--ease-out);
    display: flex;
    flex-direction: column;
  }

  .batch-card:hover {
    box-shadow: none;
    transform: translateY(-2px);
  }

  .batch-thumb-wrap {
    width: 100%;
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    background: var(--card);
    border-bottom: 1px solid var(--border);
  }

  .batch-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .batch-thumb-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-stone);
    font-size: 40px;
    opacity: 0.4;
  }

  .batch-status-badge {
    position: absolute;
    top: 10px;
    left: 10px;
  }

  .batch-info {
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .batch-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.4;
    margin: 0;
  }

  .batch-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: var(--space-xs);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--border);
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-stone);
  }

  .meta-row i {
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .poll-thumb-wrap {
    aspect-ratio: 16 / 9;
  }

  @media (max-width: 768px) {
    .controls-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-wrap {
      max-width: 100%;
    }

    .count-label {
      margin-left: 0;
    }
  }
</style>
