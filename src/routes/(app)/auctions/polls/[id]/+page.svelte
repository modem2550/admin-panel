<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let poll = $derived(data.poll);
  let loadError = $derived(data.error as string | null);
  let selectedThankYouImage = $state<string | null>(null);

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
</script>

<svelte:head>
  <title>{poll?.pollName ?? "Poll"} — Admin Panel</title>
</svelte:head>

<div class="poll-detail fade-in">
  <a href="/auctions?tab=polls" class="back-link">
    <i class="fa-solid fa-arrow-left"></i>
    Back to Poll Posters
  </a>

  {#if loadError}
    <div class="error-banner">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{loadError}</span>
    </div>
  {:else if poll}
    <div class="poll-section card">
      <div class="poll-header">
        <div class="poll-header-info">
          <p class="text-mono-label page-label">iam48 API</p>
          <span class="chip chip-completed"><i class="fa-solid fa-fire"></i> {poll.tokenName}</span>
          <h1 class="poll-title">{poll.pollName}</h1>
          <p class="poll-question">{poll.question}</p>
          <div class="poll-dates">
            <span class="meta-row">
              <i class="fa-regular fa-calendar"></i>
              {formatDate(poll.startDate)} – {formatDate(poll.endDate)}
            </span>
            <span class="meta-row">
              <i class="fa-solid fa-check-to-slot"></i>
              Status: {poll.eventStatus}
            </span>
            <span class="meta-row">
              <i class="fa-solid fa-images"></i>
              {poll.results.length} results
            </span>
          </div>
        </div>
        <div class="poll-cover">
          {#if poll.coverPhotoUrl}
            <img src={poll.coverPhotoUrl} alt={poll.pollName} class="cover-image" />
          {:else}
            <div class="cover-placeholder"><i class="fa-solid fa-image"></i></div>
          {/if}
        </div>
      </div>

      <div class="poll-results-title">
        <h2><i class="fa-solid fa-ranking-star"></i> Results Board</h2>
      </div>

      {#if poll.results.length === 0}
        <div class="empty-state">
          <i class="fa-solid fa-square-poll-vertical"></i>
          <p>No results for this poll.</p>
        </div>
      {:else}
        <div class="poll-results-grid">
          {#each poll.results as result, index}
            <div class="result-poster">
              <div class="rank-badge rank-{index + 1}">{index + 1}</div>
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="poster-image-wrap {result.thankyouImageUrl ? 'clickable' : ''}"
                onclick={() => {
                  if (result.thankyouImageUrl) selectedThankYouImage = result.thankyouImageUrl;
                }}
              >
                <img src={result.imageUrl} alt={result.answer} class="poster-image" loading="lazy" />
              </div>
              <div class="poster-info">
                <h3 class="poster-name">{result.answer}</h3>
                <p class="poster-team">{result.teamName}</p>
                <div class="poster-score">
                  <i class="fa-solid fa-coins"></i>
                  <span>
                    {Number(result.numOfVoter).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if selectedThankYouImage}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop fade-in" onclick={() => (selectedThankYouImage = null)}>
    <div class="modal-content fade-in-up" onclick={(e) => e.stopPropagation()}>
      <button class="modal-close" onclick={() => (selectedThankYouImage = null)} aria-label="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <img src={selectedThankYouImage} alt="Thank You" class="thankyou-image" />
    </div>
  </div>
{/if}

<style>
  .poll-detail {
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

  .poll-section {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    background: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-none);
  }

  .poll-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    border-bottom: 1px solid var(--color-card-border);
    padding-bottom: 24px;
  }

  .poll-header-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .poll-title {
    font-family: var(--font-body);
    font-size: 28px;
    font-weight: 400;
    color: var(--color-ink);
    margin: 0;
    line-height: 1;
    letter-spacing: -0.5px;
  }

  .poll-question {
    font-size: 15px;
    color: var(--color-body-muted);
    margin: 0;
  }

  .poll-dates {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-muted);
  }

  .poll-cover {
    width: 240px;
    aspect-ratio: 16/9;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--color-soft-stone);
    flex-shrink: 0;
    border: 1px solid var(--color-card-border);
  }

  .cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: var(--color-muted);
    opacity: 0.5;
  }

  .poll-results-title h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .poll-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 20px;
  }

  .result-poster {
    position: relative;
    background: var(--color-canvas-warm);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: border-color var(--duration-normal) var(--ease-out);
  }

  .result-poster:hover {
    border-color: var(--color-hairline-soft);
  }

  .poster-image-wrap {
    width: 100%;
    aspect-ratio: 3/4;
    background: var(--color-soft-stone);
    overflow: hidden;
  }

  .poster-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .poster-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
    background: var(--color-canvas);
  }

  .poster-name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .poster-team {
    margin: 0;
    font-size: 11px;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .poster-score {
    margin-top: var(--space-xs);
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-ink);
    font-weight: 600;
    font-size: 14px;
  }

  .rank-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-footer);
    color: var(--color-on-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 13px;
    z-index: 2;
  }

  .rank-1,
  .rank-2,
  .rank-3 {
    background: var(--color-ink);
    color: var(--color-on-primary);
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(3, 3, 3, 0.75);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }

  .modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background: var(--color-canvas);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-hairline);
    overflow: hidden;
  }

  .modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    transition: background 0.2s;
  }

  .modal-close:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .thankyou-image {
    max-width: 100%;
    max-height: 90vh;
    display: block;
    object-fit: contain;
  }

  .clickable {
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .poll-header {
      flex-direction: column;
    }

    .poll-cover {
      width: 100%;
    }

    .poll-results-grid {
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    }
  }
</style>
