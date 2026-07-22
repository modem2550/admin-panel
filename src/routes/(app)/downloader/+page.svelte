<script lang="ts">
  import { onDestroy } from 'svelte';
  import { searchMember, getVOD, startDownload, resolveUrl, getJobStatus, type MemberCandidate } from '$lib/api';

  // ── State ────────────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let searchType = $state<'lives' | 'posts'>('posts');
  let loading = $state(false);
  let error = $state('');

  let results = $state<any[]>([]);
  let memberName = $state('');
  let memberId = $state<number | null>(null);

  // Pagination for the results grid — we fetch a small first page for speed,
  // then let the user pull more in via a "Load more" button.
  const PAGE_SIZE = 60;
  let hasMoreResults = $state(false);
  let loadingMore = $state(false);
  let nextSkip = $state(0);
  let nextLastId = $state<string | undefined>(undefined);

  // When the search term matches more than one member (e.g. same codeName/real name
  // shared by members in different brands/generations), show a picker instead of
  // guessing which one the user meant.
  let memberCandidates = $state<MemberCandidate[]>([]);
  let pendingSearchQuery = $state('');

  // Direct resolve results
  let directVod = $state<any>(null);
  let directTimeline = $state<any>(null);
  let directCampaign = $state<any>(null);

  // Modal
  let modalItem = $state<any>(null);
  let loadingVod = $state(false);
  let vodError = $state('');

  // Derived detail properties for modal
  let contentText = $derived(
    modalItem?.info?.contentText ||
    modalItem?.info?.content?.contentText ||
    modalItem?.info?.description ||
    modalItem?._originalItem?.title ||
    ''
  );

  let postedAt = $derived(
    modalItem?.info?.postedAt ||
    modalItem?.info?.content?.postedAt ||
    modalItem?.info?.publishedAt ||
    modalItem?.info?.created_at ||
    modalItem?._originalItem?.publishedAt ||
    ''
  );

  // Direct VOD/Timeline derived
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

  // Download tracking: jobId per key (url or item id)
  let downloadingId = $state('');
  let downloadJobs = $state<Record<string, { jobId: string; progress: number; status: string }>>({});

  // Keep references to every active polling interval so we can clear them all
  // if the user navigates away before a download finishes — otherwise they'd
  // keep firing fetch() calls in the background forever.
  const activePollIntervals = new Set<ReturnType<typeof setInterval>>();

  onDestroy(() => {
    for (const interval of activePollIntervals) {
      clearInterval(interval);
    }
    activePollIntervals.clear();
  });

  // ── Search ───────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!searchQuery.trim()) return;

    loading = true;
    error = '';
    results = [];
    directVod = null;
    directTimeline = null;
    directCampaign = null;
    modalItem = null;
    memberCandidates = [];
    hasMoreResults = false;
    nextSkip = 0;
    nextLastId = undefined;

    const query = searchQuery.trim();
    pendingSearchQuery = query;

    try {
      const data = await searchMember(query, searchType, 0, PAGE_SIZE);

      if (data.members) {
        // Same name matches more than one member — ask the user to pick.
        memberCandidates = data.members;
      } else if (data.directCampaign) {
        directCampaign = data.directCampaign;
      } else if (data.directVod) {
        directVod = data.directVod;
      } else if (data.directTimeline) {
        directTimeline = data.directTimeline;
      } else if (data.lives) {
        results = data.lives;
        memberName = data.memberName || searchQuery;
        memberId = data.memberId;
        hasMoreResults = !!data.hasMore;
        nextSkip = data.nextSkip ?? results.length;
      } else if (data.posts) {
        results = data.posts;
        memberName = data.memberName || searchQuery;
        memberId = data.memberId;
        hasMoreResults = !!data.hasMore;
        nextLastId = data.nextLastId ?? undefined;
      } else if (data.error) {
        error = data.error;
      }
    } catch (e: any) {
      error = e.message || 'Search failed';
    } finally {
      loading = false;
    }
  }

  // ── Pick a member when the name matches more than one person ─────────────
  async function selectMemberCandidate(candidate: MemberCandidate) {
    loading = true;
    error = '';
    results = [];
    modalItem = null;
    hasMoreResults = false;
    nextSkip = 0;
    nextLastId = undefined;

    try {
      const data = await searchMember(pendingSearchQuery, searchType, 0, PAGE_SIZE, undefined, candidate.id);

      if (data.lives) {
        results = data.lives;
        memberName = data.memberName || candidate.displayNameEn || candidate.displayName;
        memberId = data.memberId;
        memberCandidates = [];
        hasMoreResults = !!data.hasMore;
        nextSkip = data.nextSkip ?? results.length;
      } else if (data.posts) {
        results = data.posts;
        memberName = data.memberName || candidate.displayNameEn || candidate.displayName;
        memberId = data.memberId;
        memberCandidates = [];
        hasMoreResults = !!data.hasMore;
        nextLastId = data.nextLastId ?? undefined;
      } else if (data.error) {
        error = data.error;
      }
    } catch (e: any) {
      error = e.message || 'Search failed';
    } finally {
      loading = false;
    }
  }

  // ── Load more results (pagination) ────────────────────────────────────────
  async function loadMoreResults() {
    if (loadingMore || !hasMoreResults || !memberId) return;

    loadingMore = true;
    error = '';

    try {
      const data = await searchMember(
        pendingSearchQuery || searchQuery.trim(),
        searchType,
        nextSkip,
        PAGE_SIZE,
        nextLastId,
        memberId
      );

      if (searchType === 'lives' && data.lives) {
        results = [...results, ...data.lives];
        hasMoreResults = !!data.hasMore;
        nextSkip = data.nextSkip ?? results.length;
      } else if (searchType === 'posts' && data.posts) {
        results = [...results, ...data.posts];
        hasMoreResults = !!data.hasMore;
        nextLastId = data.nextLastId ?? undefined;
      } else if (data.error) {
        error = data.error;
      }
    } catch (e: any) {
      error = e.message || 'Failed to load more';
    } finally {
      loadingMore = false;
    }
  }

  // ── Open Modal: get VOD info then show popup ──────────────────────────────
  async function openModal(item: any) {
    const videoId = item.id || item.contentId;
    if (!videoId) return;

    loadingVod = true;
    vodError = '';
    // show modal immediately with item info while loading
    modalItem = { _originalItem: item, _loading: true };

    try {
      const timelineTypes = [
        'content-member-timeline',
        'content-member-batch-thankyou',
        'content-member-live-playback',
      ];
      if (item.itemType && timelineTypes.includes(item.itemType)) {
        const data = await resolveUrl(
          `https://public.bnk48.io/timeline/${item.itemType}/${item.contentId || item.id}`
        );
        if (data.directTimeline) {
          modalItem = {
            ...data.directTimeline,
            _isTimeline: true,
            _originalItem: item,
            _loading: false,
          };
        } else if (data.directVod) {
          modalItem = { ...data.directVod, _originalItem: item, _loading: false };
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          // fallback: show original item info only
          modalItem = { _originalItem: item, _loading: false, _fallback: true };
        }
      } else {
        const data = await getVOD(videoId);
        modalItem = { ...data.vod, _originalItem: item, _loading: false };
      }
    } catch (e: any) {
      vodError = e.message || 'Failed to get VOD info';
      modalItem = null;
    } finally {
      loadingVod = false;
    }
  }

  function closeModal() {
    modalItem = null;
    vodError = '';
  }

  // ── Download with progress polling ────────────────────────────────────────
  async function handleDownload(url: string, fileName: string, duration?: number, trackKey?: string) {
    if (!url) return;
    const key = trackKey || url;
    downloadingId = key;

    try {
      const data = await startDownload(url, fileName, duration);
      if (data.jobId) {
        downloadJobs[key] = { jobId: data.jobId, progress: 0, status: 'queued' };
        pollJobProgress(key, data.jobId);
      }
    } catch (e: any) {
      error = e.message || 'Download failed';
    } finally {
      downloadingId = '';
    }
  }

  function pollJobProgress(key: string, jobId: string) {
    const interval = setInterval(async () => {
      try {
        const data = await getJobStatus(jobId);
        const job = data.job;
        if (job) {
          downloadJobs[key] = {
            jobId,
            progress: job.progress ?? 0,
            status: job.status,
          };
          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            activePollIntervals.delete(interval);
          }
        }
      } catch {
        clearInterval(interval);
        activePollIntervals.delete(interval);
      }
    }, 1500);
    activePollIntervals.add(interval);
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

  function getItemKey(item: any) {
    return String(item.id || item.contentId || '');
  }

  function getJobForItem(item: any) {
    return downloadJobs[getItemKey(item)] || null;
  }

  function getJobForUrl(url: string) {
    return downloadJobs[url] || null;
  }

  function getProgressColor(status: string) {
    if (status === 'completed') return '#22c55e';
    if (status === 'failed') return '#ef4444';
    return 'var(--color-primary)';
  }

  // Close modal on backdrop click or Escape
  function onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      closeModal();
    }
  }

  function onModalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
  }
</script>

<svelte:head>
  <title>VOD Downloader — Admin Panel</title>
</svelte:head>

<svelte:window onkeydown={onModalKeydown} />

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
        <i class="ti ti-magnifying-glass search-icon"></i>
        <input
          type="text"
          class="form-input search-input"
          placeholder="Member name or paste URL..."
          bind:value={searchQuery}
          onkeydown={onKeydown}
        />
      </div>
      <div class="search-actions">
        <button
          class="btn btn-primary"
          onclick={handleSearch}
          disabled={loading || !searchQuery.trim()}
        >
          {#if loading}
            <i class="ti ti-loader ti-spin"></i>
          {:else}
            <i class="ti ti-search"></i>
          {/if}
          Search
        </button>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="error-banner fade-in">
      <i class="ti ti-alert-circle"></i>
      <span>{error}</span>
      <button class="btn-icon" onclick={() => error = ''} aria-label="Dismiss error">
        <i class="ti ti-x"></i>
      </button>
    </div>
  {/if}

  <!-- Member Name Clash: pick which member ────────────────────────────────── -->
  {#if memberCandidates.length > 0}
    <section class="result-section fade-in">
      <h2 class="text-feature-heading section-title">
        Multiple members named "{pendingSearchQuery}"
      </h2>
      <p class="text-caption" style="color: var(--color-muted); margin-top: -4px; margin-bottom: 4px;">
        This name is shared by more than one member — pick who you meant.
      </p>
      <div class="member-pick-grid">
        {#each memberCandidates as candidate, i}
          <button
            class="member-pick-card"
            onclick={() => selectMemberCandidate(candidate)}
            disabled={loading}
          >
            {#if candidate.profileImageUrl}
              <img src={candidate.profileImageUrl} alt={candidate.displayNameEn} class="member-pick-avatar" loading="lazy" decoding="async" />
            {:else}
              <div class="member-pick-avatar member-pick-avatar-placeholder">
                <i class="ti ti-user"></i>
              </div>
            {/if}
            <div class="member-pick-info">
              <p class="member-pick-badge">Person {i + 1}</p>
              <p class="member-pick-name">{candidate.displayName} ({candidate.displayNameEn})</p>
              <p class="member-pick-realname">{candidate.subtitle}</p>
              <p class="member-pick-realname-en">{candidate.subtitleEn}</p>
              {#if candidate.brand}
                <span class="chip chip-queued member-pick-brand">{candidate.brand}</span>
              {/if}
            </div>
            {#if loading}
              <i class="ti ti-loader ti-spin member-pick-loading"></i>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Direct VOD Result -->
  {#if directVod}
    <section class="result-section fade-in">
      <h2 class="text-feature-heading section-title">Direct VOD Result</h2>
      <div class="vod-detail card">
        <div class="vod-detail-inner">
          {#if directVod.thumbnail}
            <img src={directVod.thumbnail} alt="Thumbnail" class="vod-thumb" loading="lazy" decoding="async" />
          {:else}
            <div class="vod-thumb thumbnail-placeholder"><i class="ti ti-video"></i></div>
          {/if}
          <div class="vod-info">
            <h3 class="text-body-large">{directVod.fileName || 'VOD'}</h3>
            {#if directVodPostedAt}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                <i class="ti ti-calendar" style="margin-right: 4px;"></i> {new Date(directVodPostedAt).toLocaleString()}
              </p>
            {/if}
            {#if directVodContentText}
              <p class="text-body" style="margin-top: 8px; white-space: pre-wrap; font-size: 14px; color: var(--color-body-muted); background: var(--color-soft-stone); padding: 10px; border-radius: 8px;">
                {directVodContentText}
              </p>
            {/if}
            {#if directVod.resourceUrl}
              {@const jobDirect = getJobForUrl(directVod.resourceUrl)}
              <div style="margin-top: 16px;">
                {#if jobDirect}
                  <ProgressBar job={jobDirect} />
                {:else}
                  <button
                    class="btn btn-primary btn-sm"
                    onclick={() => handleDownload(directVod.resourceUrl, directVod.fileName, undefined, directVod.resourceUrl)}
                    disabled={downloadingId === directVod.resourceUrl}
                  >
                    {#if downloadingId === directVod.resourceUrl}
                      <i class="ti ti-loader ti-spin"></i>
                    {:else}
                      <i class="ti ti-download"></i>
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
            <img src={directTimeline.thumbnail} alt="Thumbnail" class="vod-thumb" loading="lazy" decoding="async" />
          {:else}
            <div class="vod-thumb thumbnail-placeholder"><i class="ti ti-images"></i></div>
          {/if}
          <div class="vod-info">
            <h3 class="text-body-large">{directTimeline.fileName || 'Timeline Post'}</h3>
            {#if directTimelinePostedAt}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                <i class="ti ti-calendar" style="margin-right: 4px;"></i> {new Date(directTimelinePostedAt).toLocaleString()}
              </p>
            {/if}
            {#if directTimelineContentText}
              <p class="text-body" style="margin-top: 8px; white-space: pre-wrap; font-size: 14px; color: var(--color-body-muted); background: var(--color-soft-stone); padding: 10px; border-radius: 8px;">
                {directTimelineContentText}
              </p>
            {/if}
            {#if directTimeline.images?.length}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 8px;">
                {directTimeline.images.length} image(s)
              </p>
            {/if}
            {#if directTimeline.resourceUrl}
              {@const jobTl = getJobForUrl(directTimeline.resourceUrl)}
              <div style="margin-top: 16px;">
                {#if jobTl}
                  <ProgressBar job={jobTl} />
                {:else}
                  <button
                    class="btn btn-primary btn-sm"
                    onclick={() => handleDownload(directTimeline.resourceUrl, directTimeline.fileName, undefined, directTimeline.resourceUrl)}
                    disabled={downloadingId === directTimeline.resourceUrl}
                  >
                    <i class="ti ti-download"></i> Download Video
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        </div>
        {#if directTimeline.images?.length > 0}
          <div class="timeline-images">
            {#each directTimeline.images as img}
              <img src={img} alt="Timeline" class="timeline-img" loading="lazy" decoding="async" />
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
            <img src={directCampaign.imageUrl} alt="Thumbnail" class="vod-thumb" loading="lazy" decoding="async" />
          {:else}
            <div class="vod-thumb thumbnail-placeholder"><i class="ti ti-flag"></i></div>
          {/if}
          <div class="vod-info">
            <h3 class="text-body-large">{directCampaign.title || 'Campaign'}</h3>
            {#if directCampaign.endAt}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                <i class="ti ti-calendar" style="margin-right: 4px;"></i> Ends at: {new Date(directCampaign.endAt).toLocaleString()}
              </p>
            {/if}
            {#if directCampaign.description}
              <p class="text-body" style="margin-top: 8px; white-space: pre-wrap; font-size: 14px; color: var(--color-body-muted); background: var(--color-soft-stone); padding: 10px; border-radius: 8px;">
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

  <!-- Search Results (Grid) -->
  {#if results.length > 0}
    <section class="result-section fade-in">
      <div class="result-header">
        <h2 class="text-feature-heading section-title">
          {memberName}
          <span class="result-count">{results.length} results</span>
        </h2>
      </div>

      <div class="results-grid">
        {#each results as item}
          {@const job = getJobForItem(item)}
          <button
            class="grid-card"
            class:has-job={!!job}
            onclick={() => openModal(item)}
            aria-label="View {item.title || item.id}"
          >
            <div class="grid-thumb-wrap">
              {#if item.thumbnailImageUrl || item.thumbnail}
                <img src={item.thumbnailImageUrl || item.thumbnail} alt="" class="grid-thumb" loading="lazy" decoding="async" />
              {:else}
                <div class="grid-thumb grid-thumb-placeholder">
                  <i class="ti ti-{searchType === 'lives' ? 'live-photo' : 'photo'}"></i>
                </div>
              {/if}
              {#if item.itemType}
                <span class="grid-type-badge">{item.itemType.replace('content-member-', '')}</span>
              {/if}
              {#if job}
                <div class="grid-progress-overlay">
                  {#if job.status === 'completed'}
                    <i class="ti ti-circle-check" style="color: #22c55e; font-size: 24px;"></i>
                  {:else if job.status === 'failed'}
                    <i class="ti ti-circle-x" style="color: #ef4444; font-size: 24px;"></i>
                  {:else}
                    <div class="grid-progress-ring">
                      <svg viewBox="0 0 36 36" width="44" height="44">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
                        <circle
                          cx="18" cy="18" r="15"
                          fill="none"
                          stroke="white"
                          stroke-width="3"
                          stroke-dasharray="{(job.progress / 100) * 94.25} 94.25"
                          stroke-linecap="round"
                          transform="rotate(-90 18 18)"
                        />
                      </svg>
                      <span class="grid-progress-pct">{Math.round(job.progress)}%</span>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="grid-info">
              <p class="grid-title">{item.title || item.id || 'Untitled'}</p>
              <p class="grid-date">{formatDate(item.publishedAt)}</p>
            </div>
          </button>
        {/each}
      </div>

      {#if hasMoreResults}
        <div class="load-more-wrap">
          <button
            class="btn btn-secondary"
            onclick={loadMoreResults}
            disabled={loadingMore}
          >
            {#if loadingMore}
              <i class="ti ti-loader ti-spin"></i> Loading…
            {:else}
              <i class="ti ti-chevron-down"></i> Load more
            {/if}
          </button>
        </div>
      {/if}
    </section>
  {/if}

  <!-- VOD Error -->
  {#if vodError}
    <div class="error-banner fade-in" style="margin-top: 12px;">
      <i class="ti ti-alert-circle"></i>
      <span>{vodError}</span>
      <button class="btn-icon" onclick={() => vodError = ''} aria-label="Dismiss error">
        <i class="ti ti-x"></i>
      </button>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !loading && !error && results.length === 0 && memberCandidates.length === 0 && !directVod && !directTimeline && !directCampaign && searchQuery === ''}
    <div class="empty-state">
      <i class="ti ti-download"></i>
      <p>Enter a member name or paste a URL to get started.</p>
    </div>
  {/if}
</div>

<!-- ── Modal Popup ────────────────────────────────────────────────────────── -->
{#if modalItem || loadingVod}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onBackdropClick} role="dialog" aria-modal="true" aria-label="Order details" tabindex="-1">
    <div class="modal-panel">
      <!-- Modal header -->
      <div class="modal-header">
        <div class="modal-title-group">
          <i class="ti ti-{modalItem?._isTimeline ? 'photo' : 'video'} modal-icon"></i>
          <h2 class="modal-title">
            {modalItem?._isTimeline ? 'Timeline Detail' : 'VOD Detail'}
          </h2>
        </div>
        <button class="btn-icon modal-close" onclick={closeModal} aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <div class="modal-body">
        {#if loadingVod && modalItem?._loading}
          <!-- Loading state -->
          <div class="modal-loading">
            <div class="modal-loading-spinner">
              <i class="ti ti-loader ti-spin"></i>
            </div>
            <p>Fetching order details...</p>
            {#if modalItem._originalItem}
              <p class="text-caption" style="color: var(--color-muted); margin-top: 4px;">
                {modalItem._originalItem.title || modalItem._originalItem.id || ''}
              </p>
            {/if}
          </div>
        {:else if modalItem}
          <!-- Media preview: video or images -->
          {#if modalItem.resourceUrl}
            <!-- Has video stream → show video player with thumbnail poster -->
            <div class="modal-media-wrap">
              <video
                class="modal-video"
                src={modalItem.resourceUrl}
                poster={modalItem.thumbnail || ''}
                controls
                preload="none"
                playsinline
              ></video>
            </div>
          {:else if modalItem.images?.length > 1}
            <!-- Multiple images → scrollable strip -->
            <div class="modal-images-strip">
              {#each modalItem.images as img, i}
                <a href={img} target="_blank" rel="noopener" class="modal-strip-link">
                  <img src={img} alt="Image {i + 1}" class="modal-strip-img" loading="lazy" decoding="async" />
                </a>
              {/each}
            </div>
          {:else if modalItem.thumbnail || modalItem.images?.[0]}
            <!-- Single image / thumbnail -->
            <div class="modal-thumb-wrap">
              <img src={modalItem.thumbnail || modalItem.images[0]} alt="Thumbnail" class="modal-thumb" loading="lazy" decoding="async" />
            </div>
          {/if}

          <!-- Info fields -->
          <div class="modal-fields">
            <!-- File name -->
            <div class="modal-field">
              <span class="field-label"><i class="ti ti-file"></i> Filename</span>
              <span class="field-value">{modalItem.fileName || modalItem._originalItem?.title || 'Untitled'}</span>
            </div>

            <!-- Posted at -->
            {#if postedAt}
              <div class="modal-field">
                <span class="field-label"><i class="ti ti-calendar"></i> Posted</span>
                <span class="field-value">{new Date(postedAt).toLocaleString('th-TH')}</span>
              </div>
            {/if}

            <!-- Item type -->
            {#if modalItem._originalItem?.itemType}
              <div class="modal-field">
                <span class="field-label"><i class="ti ti-tag"></i> Type</span>
                <span class="field-value">
                  <span class="chip chip-queued">{modalItem._originalItem.itemType.replace('content-member-', '')}</span>
                </span>
              </div>
            {/if}

            <!-- Duration -->
            {#if modalItem.info?.duration}
              <div class="modal-field">
                <span class="field-label"><i class="ti ti-clock"></i> Duration</span>
                <span class="field-value">{Math.floor(modalItem.info.duration / 60)}m {modalItem.info.duration % 60}s</span>
              </div>
            {/if}

            <!-- Content / description -->
            {#if contentText}
              <div class="modal-field modal-field-block">
                <span class="field-label"><i class="ti ti-align-left"></i> Description</span>
                <p class="field-value field-text">{contentText}</p>
              </div>
            {/if}

            <!-- Resource URL -->
            {#if modalItem.resourceUrl}
              <div class="modal-field">
                <span class="field-label"><i class="ti ti-link"></i> Resource</span>
                <span class="field-value field-url">Video stream available</span>
              </div>
            {/if}

            <!-- Images count (timeline) -->
            {#if modalItem._isTimeline && modalItem.images?.length}
              <div class="modal-field">
                <span class="field-label"><i class="ti ti-photo"></i> Images</span>
                <span class="field-value">{modalItem.images.length} image(s)</span>
              </div>
            {/if}

            <!-- Raw info dump (additional fields) -->
            {#if modalItem.info}
              {#each Object.entries(modalItem.info).filter(([k]) => !['contentText', 'content', 'description', 'duration', 'postedAt', 'publishedAt', 'created_at'].includes(k)) as [key, val]}
                {#if val && typeof val !== 'object'}
                  <div class="modal-field">
                    <span class="field-label"><i class="ti ti-info-circle"></i> {key}</span>
                    <span class="field-value field-mono">{val}</span>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>

          <!-- Timeline images preview -->
          {#if modalItem._isTimeline && modalItem.images?.length > 0}
            <div class="modal-images">
              {#each modalItem.images as img}
                <a href={img} target="_blank" rel="noopener">
                  <img src={img} alt="Timeline" class="modal-img" loading="lazy" decoding="async" />
                </a>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Modal footer: download button -->
      {#if modalItem && !modalItem._loading}
        {@const modalKey = modalItem.resourceUrl || getItemKey(modalItem._originalItem || {})}
        {@const modalJob = getJobForUrl(modalKey)}
        <div class="modal-footer">
          {#if modalItem.resourceUrl}
            {#if modalJob}
              <div class="modal-progress-wrap">
                <div class="modal-progress-header">
                  {#if modalJob.status === 'completed'}
                    <i class="ti ti-circle-check" style="color: #22c55e;"></i>
                    <span style="color: #22c55e; font-weight: 500;">Download complete</span>
                  {:else if modalJob.status === 'failed'}
                    <i class="ti ti-circle-x" style="color: #ef4444;"></i>
                    <span style="color: #ef4444; font-weight: 500;">Download failed</span>
                  {:else}
                    <i class="ti ti-download ti-spin" style="color: var(--color-primary);"></i>
                    <span style="color: var(--color-primary); font-weight: 500;">
                      Downloading… {Math.round(modalJob.progress)}%
                    </span>
                  {/if}
                </div>
                {#if modalJob.status !== 'completed' && modalJob.status !== 'failed'}
                  <div class="modal-progress-bar">
                    <div
                      class="modal-progress-fill"
                      style="width: {modalJob.progress}%;"
                    ></div>
                  </div>
                {/if}
              </div>
            {:else}
              <button
                class="btn btn-primary modal-download-btn"
                onclick={() => handleDownload(modalItem.resourceUrl, modalItem.fileName, modalItem.info?.duration, modalItem.resourceUrl)}
                disabled={downloadingId === modalItem.resourceUrl}
              >
                {#if downloadingId === modalItem.resourceUrl}
                  <i class="ti ti-loader ti-spin"></i> Starting…
                {:else}
                  <i class="ti ti-download"></i> Download MP4
                {/if}
              </button>
            {/if}
          {:else if modalItem._isTimeline && modalItem.images?.length > 0}
            <p class="modal-no-video"><i class="ti ti-photo"></i> {modalItem.images.length} image(s) — no video stream</p>
          {:else}
            <p class="modal-no-video"><i class="ti ti-ban"></i> No downloadable resource found</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- ── Inline ProgressBar snippet (used for direct results) ─────────────── -->
{#snippet ProgressBar(job: { jobId: string; progress: number; status: string })}
  <div class="inline-progress">
    <div class="inline-progress-header">
      {#if job.status === 'completed'}
        <i class="ti ti-circle-check" style="color: #22c55e;"></i>
        <span style="color: #22c55e;">Complete</span>
      {:else if job.status === 'failed'}
        <i class="ti ti-circle-x" style="color: #ef4444;"></i>
        <span style="color: #ef4444;">Failed</span>
      {:else}
        <i class="ti ti-download" style="color: var(--color-primary);"></i>
        <span>{Math.round(job.progress)}%</span>
      {/if}
    </div>
    {#if job.status !== 'completed' && job.status !== 'failed'}
      <div class="inline-progress-bar">
        <div class="inline-progress-fill" style="width: {job.progress}%;"></div>
      </div>
    {/if}
  </div>
{/snippet}

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

  /* ── Results Header ──────────────────────────────────────────────────── */
  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
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

  /* ── Member disambiguation picker ────────────────────────────────────── */
  .member-pick-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }

  .member-pick-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: var(--color-card-bg, #fff);
    border: 1px solid var(--color-card-border);
    border-radius: 12px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .member-pick-card:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
    border-color: var(--color-primary, #6366f1);
  }

  .member-pick-card:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .member-pick-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .member-pick-avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-soft-stone, #f1f5f9);
    color: var(--color-muted);
    font-size: 22px;
  }

  .member-pick-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .member-pick-badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-primary, #6366f1);
    margin: 0 0 2px;
  }

  .member-pick-name {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: var(--ink);
  }

  .member-pick-realname {
    font-size: 13px;
    margin: 0;
    color: var(--color-body-muted);
  }

  .member-pick-realname-en {
    font-size: 12px;
    margin: 0;
    color: var(--color-muted);
  }

  .member-pick-brand {
    margin-top: 6px;
    width: fit-content;
  }

  .member-pick-loading {
    margin-left: auto;
    color: var(--color-primary, #6366f1);
    font-size: 18px;
    flex-shrink: 0;
  }

  /* ── Results Grid ────────────────────────────────────────────────────── */
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
  }

  .load-more-wrap {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  .grid-card {
    display: flex;
    flex-direction: column;
    background: var(--color-card-bg, #fff);
    border: 1px solid var(--color-card-border);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    text-align: left;
    padding: 0;
  }

  .grid-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    border-color: var(--color-primary, #6366f1);
  }

  .grid-card:active {
    transform: translateY(-1px);
  }

  .grid-card.has-job {
    border-color: var(--color-primary, #6366f1);
  }

  .grid-thumb-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--color-soft-stone, #f1f5f9);
    overflow: hidden;
  }

  .grid-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.2s ease;
  }

  .grid-card:hover .grid-thumb {
    transform: scale(1.04);
  }

  .grid-thumb-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--color-muted);
  }

  .grid-type-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(0,0,0,0.65);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Progress overlay on grid card */
  .grid-progress-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  }

  .grid-progress-ring {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .grid-progress-pct {
    position: absolute;
    font-size: 10px;
    font-weight: 700;
    color: white;
  }

  .grid-info {
    padding: 10px 12px 12px;
  }

  .grid-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }

  .grid-date {
    font-size: 11px;
    color: var(--color-muted);
    margin-top: 4px;
  }

  /* ── Inline Progress (direct results) ──────────────────────────────── */
  .inline-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .inline-progress-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .inline-progress-bar {
    height: 4px;
    background: var(--color-soft-stone, #f1f5f9);
    border-radius: 4px;
    overflow: hidden;
  }

  .inline-progress-fill {
    height: 100%;
    background: var(--color-primary, #6366f1);
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  /* ── VOD Detail (direct results) ─────────────────────────────────── */
  .vod-detail-inner {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }

  .vod-thumb {
    width: 200px;
    height: 130px;
    object-fit: cover;
    border-radius: 8px;
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
    border-radius: 8px;
  }

  /* ── Modal ───────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: backdropIn 0.15s ease;
  }

  @keyframes backdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .modal-panel {
    background: var(--color-card-bg, #fff);
    border: 1px solid var(--color-card-border);
    border-radius: 18px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.35);
    animation: panelIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    overflow: hidden;
  }

  @keyframes panelIn {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 0;
    flex-shrink: 0;
  }

  .modal-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-icon {
    font-size: 18px;
    color: var(--color-primary, #6366f1);
  }

  .modal-title {
    font-size: 17px;
    font-weight: 600;
    margin: 0;
  }

  .modal-close {
    flex-shrink: 0;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    gap: 10px;
    color: var(--color-muted);
  }

  .modal-loading-spinner {
    font-size: 28px;
    color: var(--color-primary, #6366f1);
  }

  .modal-thumb-wrap {
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .modal-thumb {
    width: 100%;
    max-height: 220px;
    object-fit: cover;
    display: block;
  }

  /* Video preview in modal */
  .modal-media-wrap {
    border-radius: 10px;
    overflow: hidden;
    background: #000;
    flex-shrink: 0;
  }

  .modal-video {
    width: 100%;
    max-height: 240px;
    display: block;
    border-radius: 10px;
  }

  /* Multi-image strip */
  .modal-images-strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
  }

  .modal-strip-link {
    flex-shrink: 0;
    display: block;
    border-radius: 8px;
    overflow: hidden;
  }

  .modal-strip-img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    display: block;
    transition: transform 0.18s ease;
  }

  .modal-strip-img:hover {
    transform: scale(1.05);
  }

  /* Fields */
  .modal-fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .modal-field {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 12px;
    background: var(--color-soft-stone, #f8fafc);
    border-radius: 8px;
    min-height: 0;
  }

  .modal-field-block {
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 90px;
  }

  .field-value {
    font-size: 13px;
    color: var(--ink);
    word-break: break-word;
    flex: 1;
  }

  .field-text {
    white-space: pre-wrap;
    line-height: 1.55;
    background: var(--color-card-bg, #fff);
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 13px;
    border: 1px solid var(--color-card-border);
  }

  .field-url {
    color: var(--color-primary, #6366f1);
    font-weight: 500;
  }

  .field-mono {
    font-family: monospace;
    font-size: 12px;
  }

  /* Timeline images in modal */
  .modal-images {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .modal-img {
    width: 90px;
    height: 90px;
    object-fit: cover;
    border-radius: 8px;
    transition: transform 0.18s ease;
  }

  .modal-img:hover {
    transform: scale(1.06);
  }

  /* Modal footer */
  .modal-footer {
    padding: 14px 20px 20px;
    border-top: 1px solid var(--color-card-border);
    flex-shrink: 0;
  }

  .modal-download-btn {
    width: 100%;
    justify-content: center;
    padding: 12px;
    font-size: 15px;
  }

  .modal-no-video {
    font-size: 13px;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Modal progress bar */
  .modal-progress-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .modal-progress-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .modal-progress-bar {
    height: 6px;
    background: var(--color-soft-stone, #f1f5f9);
    border-radius: 6px;
    overflow: hidden;
  }

  .modal-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary, #6366f1), #8b5cf6);
    border-radius: 6px;
    transition: width 0.5s ease;
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

    .vod-detail-inner {
      flex-direction: column;
    }

    .vod-thumb {
      width: 100%;
      height: auto;
      max-height: 200px;
    }

    .results-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .modal-panel {
      max-height: 95vh;
    }
  }

  @media (max-width: 480px) {
    .results-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
