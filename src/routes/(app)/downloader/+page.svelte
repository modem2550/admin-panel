<script lang="ts">
  import { searchMember, getVOD, startDownload, resolveUrl } from '$lib/api';

  // ── State ────────────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let searchType = $state<'lives' | 'posts'>('lives');
  let loading = $state(false);
  let error = $state('');

  let results = $state<any[]>([]);
  let memberName = $state('');
  let memberId = $state<number | null>(null);

  // Direct resolve results
  let directVod = $state<any>(null);
  let directTimeline = $state<any>(null);
  let directCampaign = $state<any>(null);

  // VOD detail
  let selectedVod = $state<any>(null);
  let loadingVod = $state(false);
  let vodError = $state('');

  // Derived detail properties
  let contentText = $derived(
    selectedVod?.info?.contentText ||
    selectedVod?.info?.content?.contentText ||
    selectedVod?.info?.description ||
    selectedVod?._originalItem?.title ||
    ''
  );

  let postedAt = $derived(
    selectedVod?.info?.postedAt ||
    selectedVod?.info?.content?.postedAt ||
    selectedVod?.info?.publishedAt ||
    selectedVod?.info?.created_at ||
    selectedVod?._originalItem?.publishedAt ||
    ''
  );

  let directVodContentText = $derived(
    directVod?.info?.contentText ||
    directVod?.info?.content?.contentText ||
    directVod?.info?.description ||
    ''
  );

  let directVodPostedAt = $derived(
    directVod?.info?.postedAt ||
    directVod?.info?.content?.postedAt ||
    directVod?.info?.publishedAt ||
    ''
  );

  let directTimelineContentText = $derived(
    directTimeline?.info?.contentText ||
    directTimeline?.info?.content?.contentText ||
    directTimeline?.info?.description ||
    ''
  );

  let directTimelinePostedAt = $derived(
    directTimeline?.info?.postedAt ||
    directTimeline?.info?.content?.postedAt ||
    directTimeline?.info?.publishedAt ||
    ''
  );

  // Download
  let downloadingId = $state('');
  let downloadStarted = $state<Record<string, string>>({});

  // ── Search ───────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!searchQuery.trim()) return;

    loading = true;
    error = '';
    results = [];
    directVod = null;
    directTimeline = null;
    directCampaign = null;
    selectedVod = null;

    try {
      const data = await searchMember(searchQuery.trim(), searchType);

      if (data.directCampaign) {
        directCampaign = data.directCampaign;
      } else if (data.directVod) {
        directVod = data.directVod;
      } else if (data.directTimeline) {

        directTimeline = data.directTimeline;
      } else if (data.lives) {
        results = data.lives;
        memberName = data.memberName || searchQuery;
        memberId = data.memberId;
      } else if (data.posts) {
        results = data.posts;
        memberName = data.memberName || searchQuery;
        memberId = data.memberId;
      } else if (data.error) {
        error = data.error;
      }
    } catch (e: any) {
      error = e.message || 'Search failed';
    } finally {
      loading = false;
    }
  }

  // ── Get VOD ──────────────────────────────────────────────────────────────
  async function handleGetVOD(item: any) {
    const videoId = item.id || item.contentId;
    if (!videoId) return;

    loadingVod = true;
    vodError = '';
    selectedVod = null;

    try {
      if (item.itemType === 'content-member-timeline' || item.itemType === 'content-member-batch-thankyou') {
        const data = await resolveUrl(
          `https://public.bnk48.io/timeline/${item.itemType}/${item.contentId || item.id}`
        );
        if (data.directTimeline) {
          selectedVod = {
            ...data.directTimeline,
            _isTimeline: true,
            _originalItem: item,
          };
        } else if (data.directVod) {
          selectedVod = { ...data.directVod, _originalItem: item };
        }
      } else {
        const data = await getVOD(videoId);
        selectedVod = { ...data.vod, _originalItem: item };
      }
    } catch (e: any) {
      vodError = e.message || 'Failed to get VOD info';
    } finally {
      loadingVod = false;
    }
  }

  // ── Download ─────────────────────────────────────────────────────────────
  async function handleDownload(url: string, fileName: string, duration?: number) {
    if (!url) return;
    downloadingId = url;
    try {
      const data = await startDownload(url, fileName, duration);
      if (data.jobId) {
        downloadStarted[url] = data.jobId;
      }
    } catch (e: any) {
      error = e.message || 'Download failed';
    } finally {
      downloadingId = '';
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }
</script>

<svelte:head>
  <title>VOD Downloader — Admin Panel</title>
</svelte:head>

<div class="downloader fade-in">
  <!-- Header -->
  <div class="page-header">
    <p class="text-mono-label page-label">Content Downloader</p>
    <h1 class="page-title">VOD Downloader</h1>
    <p class="page-desc">Search member lives, timeline posts, or paste a direct URL to download.</p>
  </div>

  <!-- Search Card -->
  <div class="search-section card">
    <div class="search-row">
      <div class="search-input-wrap">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          type="text"
          class="form-input search-input"
          placeholder="Member name or paste URL..."
          bind:value={searchQuery}
          onkeydown={onKeydown}
        />
      </div>
      <div class="search-actions">
        <div class="type-toggle">
          <button
            class="btn btn-coral"
            class:active={searchType === 'lives'}
            onclick={() => searchType = 'lives'}
          >Lives</button>
          <button
            class="btn btn-coral"
            class:active={searchType === 'posts'}
            onclick={() => searchType = 'posts'}
          >Posts</button>
        </div>
        <button
          class="btn btn-primary"
          onclick={handleSearch}
          disabled={loading || !searchQuery.trim()}
        >
          {#if loading}
            <i class="fa-solid fa-spinner fa-spin"></i>
          {:else}
            <i class="fa-solid fa-search"></i>
          {/if}
          Search
        </button>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="error-banner fade-in">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{error}</span>
      <button class="btn-icon" onclick={() => error = ''} aria-label="Dismiss error">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/if}

  <!-- Direct VOD Result -->
  {#if directVod}
    <section class="result-section fade-in">
      <h2 class="text-feature-heading section-title">Direct VOD Result</h2>
      <div class="vod-detail card">
        <div class="vod-detail-inner">
          {#if directVod.thumbnail}
            <img src={directVod.thumbnail} alt="Thumbnail" class="vod-thumb" />
          {:else}
            <div class="vod-thumb thumbnail-placeholder"><i class="fa-solid fa-video"></i></div>
          {/if}
          <div class="vod-info">
            <h3 class="text-body-large">{directVod.fileName || 'VOD'}</h3>
            {#if directVodPostedAt}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                <i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> {new Date(directVodPostedAt).toLocaleString()}
              </p>
            {/if}
            {#if directVodContentText}
              <p class="text-body" style="margin-top: 8px; white-space: pre-wrap; font-size: 14px; color: var(--color-body-muted); background: var(--color-soft-stone); padding: 10px; border-radius: var(--radius-sm);">
                {directVodContentText}
              </p>
            {/if}
            {#if directVod.resourceUrl}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 8px;">
                Resource URL available
              </p>
              <div style="margin-top: 16px;">
                {#if downloadStarted[directVod.resourceUrl]}
                  <span class="chip chip-completed"><span class="chip-dot"></span> Download started</span>
                {:else}
                  <button
                    class="btn btn-primary btn-sm"
                    onclick={() => handleDownload(directVod.resourceUrl, directVod.fileName)}
                    disabled={downloadingId === directVod.resourceUrl}
                  >
                    {#if downloadingId === directVod.resourceUrl}
                      <i class="fa-solid fa-spinner fa-spin"></i>
                    {:else}
                      <i class="fa-solid fa-download"></i>
                    {/if}
                    Download
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Direct Timeline Result -->
  {#if directTimeline}
    <section class="result-section fade-in">
      <h2 class="text-feature-heading section-title">Timeline Result</h2>
      <div class="vod-detail card">
        <div class="vod-detail-inner">
          {#if directTimeline.thumbnail}
            <img src={directTimeline.thumbnail} alt="Thumbnail" class="vod-thumb" />
          {:else}
            <div class="vod-thumb thumbnail-placeholder"><i class="fa-solid fa-images"></i></div>
          {/if}
          <div class="vod-info">
            <h3 class="text-body-large">{directTimeline.fileName || 'Timeline Post'}</h3>
            {#if directTimelinePostedAt}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                <i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> {new Date(directTimelinePostedAt).toLocaleString()}
              </p>
            {/if}
            {#if directTimelineContentText}
              <p class="text-body" style="margin-top: 8px; white-space: pre-wrap; font-size: 14px; color: var(--color-body-muted); background: var(--color-soft-stone); padding: 10px; border-radius: var(--radius-sm);">
                {directTimelineContentText}
              </p>
            {/if}
            {#if directTimeline.images?.length}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 8px;">
                {directTimeline.images.length} image(s)
              </p>
            {/if}
            {#if directTimeline.resourceUrl}
              <div style="margin-top: 16px;">
                {#if downloadStarted[directTimeline.resourceUrl]}
                  <span class="chip chip-completed"><span class="chip-dot"></span> Download started</span>
                {:else}
                  <button
                    class="btn btn-primary btn-sm"
                    onclick={() => handleDownload(directTimeline.resourceUrl, directTimeline.fileName)}
                    disabled={downloadingId === directTimeline.resourceUrl}
                  >
                    <i class="fa-solid fa-download"></i> Download Video
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        </div>
        {#if directTimeline.images?.length > 0}
          <div class="timeline-images">
            {#each directTimeline.images as img}
              <img src={img} alt="Timeline" class="timeline-img" />
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Direct Campaign Result -->
  {#if directCampaign}
    <section class="result-section fade-in">
      <h2 class="text-feature-heading section-title">Campaign Result</h2>
      <div class="vod-detail card">
        <div class="vod-detail-inner">
          {#if directCampaign.imageUrl}
            <img src={directCampaign.imageUrl} alt="Thumbnail" class="vod-thumb" />
          {:else}
            <div class="vod-thumb thumbnail-placeholder"><i class="fa-solid fa-flag"></i></div>
          {/if}
          <div class="vod-info">
            <h3 class="text-body-large">{directCampaign.title || 'Campaign'}</h3>
            {#if directCampaign.endAt}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                <i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Ends at: {new Date(directCampaign.endAt).toLocaleString()}
              </p>
            {/if}
            {#if directCampaign.description}
              <p class="text-body" style="margin-top: 8px; white-space: pre-wrap; font-size: 14px; color: var(--color-body-muted); background: var(--color-soft-stone); padding: 10px; border-radius: var(--radius-sm);">
                {directCampaign.description}
              </p>
            {/if}
            <p class="text-caption" style="color: var(--color-muted); margin-top: 8px;">
              Progress: {directCampaign.currentBackedCoinAmount} / {directCampaign.targetCoinAmount} coins ({directCampaign.progressPercentage}%)
            </p>
            <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
              Backers: {directCampaign.currentBackerCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Search Results -->
  {#if results.length > 0}
    <section class="result-section fade-in">
      <div class="result-header">
        <h2 class="text-feature-heading section-title">
          {memberName}
          <span class="result-count">{results.length} results</span>
        </h2>
      </div>

      <div class="results-list">
        {#each results as item, idx}
          <div class="result-row" class:selected={selectedVod?._originalItem === item}>
            <div class="result-index cell-muted">{idx + 1}</div>
            <div class="result-thumb-wrap">
              {#if item.thumbnailImageUrl || item.thumbnail}
                <img src={item.thumbnailImageUrl || item.thumbnail} alt="" class="thumbnail" />
              {:else}
                <div class="thumbnail thumbnail-placeholder">
                  <i class="fa-solid fa-image"></i>
                </div>
              {/if}
            </div>
            <div class="result-info">
              <p class="result-title truncate">{item.title || item.id || 'Untitled'}</p>
              <p class="result-date text-caption">{formatDate(item.publishedAt)}</p>
            </div>
            {#if item.itemType}
              <div class="result-type hide-mobile">
                <span class="chip chip-queued">{item.itemType.replace('content-member-', '')}</span>
              </div>
            {/if}
            <div class="result-actions">
              {#if downloadStarted[item.id || item.contentId]}
                <span class="chip chip-completed"><span class="chip-dot"></span> Queued</span>
              {:else}
                <button
                  class="btn btn-pill-outline btn-sm"
                  onclick={() => handleGetVOD(item)}
                  disabled={loadingVod}
                >
                  {#if loadingVod && selectedVod?._originalItem === item}
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  {:else}
                    <i class="fa-solid fa-play"></i>
                  {/if}
                  Get
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- VOD Detail Panel -->
  {#if selectedVod}
    <section class="vod-panel fade-in">
      <div class="dark-band">
        <div class="vod-panel-header">
          <h3 class="text-feature-heading" style="color: var(--color-on-dark);">
            {selectedVod._isTimeline ? 'Timeline Detail' : 'VOD Detail'}
          </h3>
          <button class="btn-icon" style="color: rgba(255,255,255,0.6);" onclick={() => selectedVod = null} aria-label="Close details">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="vod-panel-body">
          {#if selectedVod.thumbnail}
            <img src={selectedVod.thumbnail} alt="VOD" class="vod-panel-thumb" />
          {/if}
          <div class="vod-panel-info">
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 8px; font-weight: 500;">
              {selectedVod.fileName || 'Untitled'}
            </p>
            {#if postedAt}
              <p class="text-caption" style="color: rgba(255,255,255,0.5); margin-bottom: 8px;">
                <i class="fa-regular fa-calendar" style="margin-right: 6px;"></i> Posted: {new Date(postedAt).toLocaleString()}
              </p>
            {/if}
            {#if contentText}
              <p class="text-body" style="color: rgba(255,255,255,0.85); margin-bottom: 12px; white-space: pre-wrap; background: rgba(0, 0, 0, 0.25); padding: 12px; border-radius: var(--radius-sm); font-size: 14px; line-height: 1.5;">
                {contentText}
              </p>
            {/if}
            {#if selectedVod.resourceUrl}
              <div style="margin-top: 16px;">
                {#if downloadStarted[selectedVod.resourceUrl]}
                  <span class="chip chip-completed"><span class="chip-dot"></span> Download started</span>
                {:else}
                  <button
                    class="btn btn-primary"
                    onclick={() => handleDownload(selectedVod.resourceUrl, selectedVod.fileName, selectedVod.info?.duration)}
                    disabled={downloadingId === selectedVod.resourceUrl}
                  >
                    {#if downloadingId === selectedVod.resourceUrl}
                      <i class="fa-solid fa-spinner fa-spin"></i>
                    {:else}
                      <i class="fa-solid fa-download"></i>
                    {/if}
                    Download MP4
                  </button>
                {/if}
              </div>
            {:else if selectedVod._isTimeline && selectedVod.images?.length > 0}
              <p style="color: rgba(255,255,255,0.5); margin-top: 8px;">
                {selectedVod.images.length} image(s) available — no video stream
              </p>
            {:else}
              <p style="color: var(--color-graphite); margin-top: 8px;">
                No downloadable resource found
              </p>
            {/if}
          </div>
        </div>

        {#if selectedVod._isTimeline && selectedVod.images?.length > 0}
          <div class="vod-panel-images">
            {#each selectedVod.images as img}
              <a href={img} target="_blank" rel="noopener">
                <img src={img} alt="Timeline" class="panel-timeline-img" />
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- VOD Error -->
  {#if vodError}
    <div class="error-banner fade-in" style="margin-top: 12px;">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{vodError}</span>
      <button class="btn-icon" onclick={() => vodError = ''} aria-label="Dismiss error">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !loading && !error && results.length === 0 && !directVod && !directTimeline && !directCampaign && searchQuery === ''}
    <div class="empty-state">
      <i class="fa-solid fa-download"></i>
      <p>Enter a member name or paste a URL to get started.</p>
    </div>
  {/if}
</div>

<style>
  .downloader {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* ── Page Header ────────────────────────────────────────────────────── */
  .page-header {
    padding-bottom: var(--space-xs);
  }

  /* ── Search ─────────────────────────────────────────────────────────── */
  .search-section {
    padding: 20px 24px;
  }

  .search-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-input-wrap {
    flex: 1;
    min-width: 250px;
    position: relative;
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
    padding-left: 40px;
  }

  .search-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .type-toggle {
    display: flex;
    gap: 4px;
  }

  /* ── Error Banner ───────────────────────────────────────────────────── */

  /* ── Results ────────────────────────────────────────────────────────── */
  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .result-count {
    font-size: 14px;
    font-weight: 400;
    color: var(--color-muted);
    margin-left: 12px;
  }

  .section-title {
    margin-bottom: 0;
  }

  .results-list {
    display: flex;
    flex-direction: column;
  }

  .result-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid var(--color-card-border);
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .result-row:hover {
    background: var(--color-hairline);
    margin: 0 -8px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .result-row.selected {
    background: var(--color-hairline);
    margin: 0 -8px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .result-index {
    width: 32px;
    text-align: center;
    font-size: 12px;
    color: var(--color-stone);
    flex-shrink: 0;
  }

  .result-info {
    flex: 1;
    min-width: 0;
  }

  .result-title {
    font-size: 15px;
    font-weight: 400;
    color: var(--color-ink);
  }

  .result-date {
    color: var(--color-muted);
    margin-top: 2px;
  }

  .result-actions {
    flex-shrink: 0;
  }

  /* ── VOD Detail ─────────────────────────────────────────────────────── */
  .vod-detail-inner {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }

  .vod-thumb {
    width: 200px;
    height: 130px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    background: var(--color-soft-stone);
    flex-shrink: 0;
  }

  .vod-info {
    flex: 1;
    min-width: 0;
  }

  .timeline-images {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--color-card-border);
  }

  .timeline-img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  /* ── VOD Panel ──────────────────────────────────────────────────────── */
  .vod-panel {
    margin-top: 8px;
  }

  .vod-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .vod-panel-body {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }

  .vod-panel-thumb {
    width: 240px;
    height: 155px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .vod-panel-info {
    flex: 1;
    min-width: 0;
  }

  .vod-panel-images {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel-timeline-img {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: var(--radius-xs);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .panel-timeline-img:hover {
    transform: scale(1.05);
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .search-row {
      flex-direction: column;
      align-items: stretch;
    }

    .search-actions {
      flex-wrap: wrap;
    }

    .vod-detail-inner,
    .vod-panel-body {
      flex-direction: column;
    }

    .vod-thumb, .vod-panel-thumb {
      width: 100%;
      height: auto;
      max-height: 200px;
    }

    .result-index { display: none; }
    .result-thumb-wrap { display: none; }
  }
</style>
