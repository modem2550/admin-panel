<script lang="ts">
  import type { PageData } from "./$types";
  import type { AuctionItem } from "./+page.server";

  let { data }: { data: PageData } = $props();

  let auction = $derived(data.auction);
  let items = $derived(data.items as AuctionItem[]);
  let loadError = $derived(data.error as string | null);

  let searchQuery = $state("");

  let filteredItems = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((it) => {
      if (!q) return true;
      return (
        it.item_name.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
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

  function downloadCSV() {
    if (items.length === 0) return;

    const headers = [
      "auction_id",
      "auction_name",
      "item_id",
      "item_name",
      "category",
      "bidding_amount",
      "image_url",
    ];

    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    for (const it of items) {
      const row = [
        it.auction_id,
        `"${it.auction_name.replace(/"/g, '""')}"`,
        it.item_id,
        `"${it.item_name.replace(/"/g, '""')}"`,
        `"${it.category.replace(/"/g, '""')}"`,
        it.bidding_amount,
        it.image_url,
      ];
      csvContent += row.join(",") + "\n";
    }

    const slug = auction?.name?.replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "auction";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${slug}_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>{auction?.name ?? "Auction"} — Admin Panel</title>
</svelte:head>

<div class="auction-detail fade-in">
  <a href="/auctions" class="back-link">
    <i class="fa-solid fa-arrow-left"></i>
    Back to Auctions
  </a>

  {#if loadError}
    <div class="error-banner">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{loadError}</span>
    </div>
  {:else if auction}
    <div class="page-header">
      <div class="header-row">
        <div class="header-info">
          <p class="text-mono-label page-label">iam48 API</p>
          <h1 class="page-title">{auction.name}</h1>
          <div class="header-meta">
            <span class="chip chip-completed">{auction.eventStatus}</span>
            {#if auction.tokenSymbol}
              <span class="chip chip-queued">{auction.tokenSymbol}</span>
            {/if}
            <span class="meta-row">
              <i class="fa-regular fa-calendar"></i>
              {formatDate(auction.startDate)} – {formatDate(auction.endDate)}
            </span>
            <span class="meta-row">
              <i class="fa-solid fa-images"></i>
              {items.length} items
            </span>
          </div>
        </div>
        {#if auction.image}
          <div class="header-cover">
            <img src={auction.image} alt={auction.name} />
          </div>
        {/if}
      </div>
    </div>

    <div class="controls-bar">
      <div class="search-wrap">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          class="form-input search-input"
          type="search"
          placeholder="Search items..."
          bind:value={searchQuery}
        />
      </div>
      <button class="btn btn-primary" onclick={downloadCSV} disabled={items.length === 0}>
        <i class="fa-solid fa-download"></i>
        Export CSV
      </button>
      <span class="text-caption count-label">
        {filteredItems.length} / {items.length} items
      </span>
    </div>

    {#if items.length === 0}
      <div class="empty-state">
        <i class="fa-solid fa-gavel"></i>
        <p>No items in this auction.</p>
      </div>
    {:else if filteredItems.length === 0}
      <div class="empty-state">
        <i class="fa-solid fa-filter-circle-xmark"></i>
        <p>No items match your search.</p>
      </div>
    {:else}
      <div class="items-grid">
        {#each filteredItems as item (item.item_id)}
          <div class="item-card card">
            <div class="item-thumb-wrap">
              {#if item.image_url}
                <img
                  src={item.image_url}
                  alt={item.item_name}
                  class="item-thumb"
                  loading="lazy"
                />
              {:else}
                <div class="item-thumb item-thumb-placeholder">
                  <i class="fa-solid fa-image"></i>
                </div>
              {/if}
              {#if item.category}
                <div class="item-badge">
                  <span class="chip chip-queued">{item.category}</span>
                </div>
              {/if}
            </div>
            <div class="item-info">
              <h3 class="item-title">{item.item_name}</h3>
              <div class="item-meta">
                <span class="meta-row amount-row">
                  <i class="fa-solid fa-coins"></i>
                  <strong style="color: var(--color-ink); font-weight: 600;">
                    {item.bidding_amount.toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .auction-detail {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--color-body-muted);
    text-decoration: none;
    width: fit-content;
    transition: color var(--duration-normal) var(--ease-out);
  }

  .back-link:hover {
    color: var(--color-ink);
  }

  .header-row {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .header-info {
    flex: 1;
  }

  .header-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .header-cover {
    width: 200px;
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--color-soft-stone);
    flex-shrink: 0;
    border: 1px solid var(--color-card-border);
  }

  .header-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-muted);
  }

  .controls-bar {
    display: flex;
    align-items: center;
    gap: 12px;
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
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
    font-size: 14px;
    pointer-events: none;
  }

  .search-input {
    padding-left: 40px !important;
    height: 40px;
    font-size: 14px;
  }

  .count-label {
    color: var(--color-muted);
    margin-left: auto;
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .item-card {
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-none);
    background: var(--color-canvas);
    transition: border-color var(--duration-normal) var(--ease-out);
    display: flex;
    flex-direction: column;
  }

  .item-card:hover {
    border-color: var(--color-hairline-soft);
  }

  .item-thumb-wrap {
    width: 100%;
    position: relative;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    background: var(--color-surface-cool);
    border-bottom: 1px solid var(--color-hairline);
  }

  .item-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .item-thumb-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font-size: 32px;
    opacity: 0.4;
  }

  .item-badge {
    position: absolute;
    top: 10px;
    left: 10px;
  }

  .item-info {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .item-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-meta {
    margin-top: auto;
  }

  .amount-row {
    padding-top: 8px;
    border-top: 1px dashed var(--color-card-border);
  }

  @media (max-width: 768px) {
    .header-row {
      flex-direction: column;
    }

    .header-cover {
      width: 100%;
      max-width: 280px;
    }

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
