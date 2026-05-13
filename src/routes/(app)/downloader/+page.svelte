<script lang="ts">
    import { enhance, deserialize } from "$app/forms";
    import { toasts } from "$lib/toasts";
    import type { MemberLive, VODResult, TimelineResult } from "$lib/bnk48";

    let { form } = $props();

    let isLoading = $state(false);
    let selectedVod = $state<VODResult | null>(null);
    let selectedTimeline = $state<TimelineResult | null>(null);
    let showVodModal = $state(false);
    let showTimelineModal = $state(false);
    let fetchingVodId = $state<string | null>(null);
    let playVideo = $state(false);
    let downloadProgress = $state<number | null>(null);
    let downloadingJobId = $state<string | null>(null);
    let downloadingUrl = $state<string | null>(null);

    function closeModals() {
        showVodModal = false;
        showTimelineModal = false;
        playVideo = false;
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function isVideo(url: string | null | undefined) {
        if (!url) return false;
        // Clean the URL from query parameters for check
        const cleanUrl = url.split("?")[0].toLowerCase();
        return (
            cleanUrl.endsWith(".mp4") ||
            cleanUrl.endsWith(".m3u8") ||
            cleanUrl.endsWith(".mov") ||
            cleanUrl.endsWith(".webm")
        );
    }

    async function handleGetVod(videoId: string) {
        fetchingVodId = videoId;
        const formData = new FormData();
        formData.append("videoId", videoId);

        try {
            const response = await fetch("?/getVOD", {
                method: "POST",
                body: formData,
            });

            const text = await response.text();
            const result = deserialize(text);

            if (result.type === "success" && result.data?.vod) {
                selectedVod = result.data.vod as VODResult;
                showVodModal = true;
            } else if (result.type === "success" && result.data?.error) {
                toasts.add(String(result.data.error), "error");
            } else {
                toasts.add("Failed to fetch VOD", "error");
            }
        } catch (err) {
            toasts.add("An error occurred", "error");
        } finally {
            fetchingVodId = null;
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        toasts.add("Link copied to clipboard", "success");
    }

    function handleDownloadMp4(url: string, fileName: string, info?: any) {
        if (downloadingJobId) {
            toasts.add("A download is already in progress", "warning");
            return;
        }

        // BNK48 API often returns duration in milliseconds
        let rawDuration = info?.duration || info?.videoDuration || info?.video_duration || 0;
        if (rawDuration > 100000) { // Likely milliseconds
            rawDuration = rawDuration / 1000;
        }
        
        const duration = Math.floor(rawDuration);
        const startUrl = `/api/download/mp4?action=start&url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}&duration=${duration}`;
        
        toasts.add(`Starting compression for ${fileName}...`, "info");
        downloadProgress = 0;
        downloadingUrl = url;

        fetch(startUrl)
            .then(res => res.json())
            .then(data => {
                const jobId = data.jobId;
                downloadingJobId = jobId;
                pollDownloadStatus(jobId);
            })
            .catch(err => {
                toasts.add("Failed to start download job", "error");
                downloadProgress = null;
            });
    }

    async function pollDownloadStatus(jobId: string) {
        try {
            const res = await fetch(`/api/download/mp4?action=status&jobId=${jobId}`);
            const data = await res.json();

            if (data.status === 'processing') {
                downloadProgress = data.progress;
                setTimeout(() => pollDownloadStatus(jobId), 2000);
            } else if (data.status === 'completed') {
                downloadProgress = 100;
                toasts.add("Compression complete! Starting download...", "success");
                window.location.href = `/api/download/mp4?action=download&jobId=${jobId}`;
                setTimeout(() => {
                    downloadProgress = null;
                    downloadingJobId = null;
                    downloadingUrl = null;
                }, 3000);
            } else if (data.status === 'failed') {
                toasts.add(`Download failed: ${data.error}`, "error");
                downloadProgress = null;
                downloadingJobId = null;
                downloadingUrl = null;
            }
        } catch (err) {
            console.error("Polling error", err);
            setTimeout(() => pollDownloadStatus(jobId), 5000);
        }
    }

    $effect(() => {
        if (form?.directVod) {
            selectedVod = form.directVod as VODResult;
            showVodModal = true;
        }
        if (form?.directTimeline) {
            selectedTimeline = form.directTimeline as TimelineResult;
            showTimelineModal = true;
        }
    });
</script>

<div class="page-shell">
    <div class="co-page-hero">
        <div class="co-page-hero__main">
            <span class="mono-label">Technical intelligence</span>
            <h1 class="hero-display">Downloader</h1>
            <p class="body-large">
                Automated extraction and indexing of member broadcast
                infrastructure and media resources.
            </p>
        </div>
    </div>

    <form
            method="POST"
            action="?/search"
            use:enhance={() => {
                isLoading = true;
                return async ({ update }: { update: any }) => {
                    isLoading = false;
                    await update();
                };
            }}
            class="playback-search-form"
        >
            <div class="playback-search-field">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                    type="text"
                    name="name"
                    placeholder="Member alias or app URI endpoint…"
                    required
                    autocomplete="off"
                />
                <button
                    type="submit"
                    class="button-primary"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <i class="fa-solid fa-spinner fa-spin"></i>
                    {:else}
                        Query
                    {/if}
                </button>
            </div>
    </form>

    {#if form?.error}
        <div class="banner-error" role="alert">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>System Error: {form.error}</span>
        </div>
    {/if}

    {#if form?.lives}
        <div class="section-divider">
            <h2 class="card-heading">{form.memberName} Sessions</h2>
            <div class="mono-label">
                Total Nodes: {(form.lives as MemberLive[]).length}
            </div>
        </div>

        <div class="technical-grid">
            {#each form.lives as live (live.id)}
                <div class="media-card-co">
                    <div class="card-media">
                        <img
                            src={live.thumbnailImageUrl}
                            alt={live.title}
                            loading="lazy"
                        />
                        <button
                            class="play-trigger"
                            onclick={() => handleGetVod(live.id)}
                            disabled={fetchingVodId === live.id}
                            aria-label="Initialize VOD"
                        >
                            {#if fetchingVodId === live.id}
                                <i class="fa-solid fa-spinner fa-spin"></i>
                            {:else}
                                <i class="fa-solid fa-play"></i>
                            {/if}
                        </button>
                    </div>
                    <div class="card-info">
                        <div class="mono-label">
                            {formatDate(live.publishedAt)}
                        </div>
                        <h3 class="technical-title" title={live.title}>
                            {live.title || "UNDEFINED_SESSION"}
                        </h3>
                    </div>
                </div>
            {/each}
        </div>
    {:else if !isLoading && !form?.error}
        <div class="empty-state">
            <h3 class="card-heading">Null Response</h3>
            <p class="body">
                Enter a valid member identifier to begin technical extraction.
            </p>
        </div>
    {/if}
</div>

<!-- VOD Modal -->
{#if showVodModal && selectedVod}
    <div class="modal-overlay" onclick={closeModals} role="presentation">
        <div
            class="contact-form-card"
            onclick={(e) => e.stopPropagation()}
            role="presentation"
        >
            <div class="form-header">
                <div>
                    <span class="mono-label">VOD_RESOURCE</span>
                    <h2 class="card-heading">Playback Records</h2>
                </div>
                <button
                    class="close-trigger"
                    onclick={() => (showVodModal = false)}
                    aria-label="Close modal"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="technical-details">
                <div class="detail-row" class:is-playing={playVideo}>
                    <div class="media-preview" class:is-playing={playVideo}>
                        {#if playVideo}
                            <!-- svelte-ignore a11y_media_has_caption -->
                            <video
                                src={selectedVod.resourceUrl}
                                controls
                                autoplay
                                class="preview-video"
                            ></video>
                        {:else}
                            {#if isVideo(selectedVod.thumbnail)}
                                <!-- svelte-ignore a11y_media_has_caption -->
                                <video
                                    src={selectedVod.thumbnail}
                                    muted
                                    loop
                                    autoplay
                                    class="preview-video"
                                ></video>
                            {:else}
                                <img
                                    src={selectedVod.thumbnail}
                                    alt="Thumbnail"
                                />
                            {/if}
                            <button
                                class="play-overlay"
                                onclick={() => (playVideo = true)}
                                aria-label="Play video"
                            >
                                <i class="fa-solid fa-play"></i>
                            </button>
                        {/if}
                    </div>
                    <div class="detail-content">
                        <h3 class="technical-title">{selectedVod.fileName}</h3>
                        <p class="body-small">
                            {selectedVod.info?.description ||
                                "Technical description unavailable for this node."}
                        </p>
                    </div>
                </div>

                <div class="modal-actions-co">
                    <a
                        href={selectedVod.resourceUrl}
                        target="_blank"
                        class="button-secondary"
                        rel="noreferrer"
                    >
                        Open stream
                    </a>
                    <button
                        onclick={() =>
                            handleDownloadMp4(
                                selectedVod!.resourceUrl,
                                selectedVod!.fileName,
                                selectedVod!.info
                            )}
                        class="button-primary"
                        disabled={!!downloadingJobId}
                    >
                        {#if downloadingUrl === selectedVod.resourceUrl}
                             <i class="fa-solid fa-spinner fa-spin"></i> {downloadProgress}%
                        {:else}
                            <i class="fa-solid fa-download"></i> Download MP4
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Timeline Modal -->
{#if showTimelineModal && selectedTimeline}
    <div class="modal-overlay" onclick={closeModals} role="presentation">
        <div
            class="contact-form-card"
            onclick={(e) => e.stopPropagation()}
            role="presentation"
        >
            <div class="form-header">
                <div>
                    <span class="mono-label">TIMELINE_OBJECT</span>
                    <h2 class="card-heading">Extraction Results</h2>
                </div>
                <button
                    class="close-trigger"
                    onclick={closeModals}
                    aria-label="Close modal"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="technical-details">
                <div class="detail-row" class:is-playing={playVideo}>
                    {#if selectedTimeline.thumbnail || selectedTimeline.resourceUrl}
                        <div class="media-preview" class:is-playing={playVideo}>
                            {#if playVideo && selectedTimeline.resourceUrl}
                                <!-- svelte-ignore a11y_media_has_caption -->
                                <video
                                    src={selectedTimeline.resourceUrl}
                                    controls
                                    autoplay
                                    class="preview-video"
                                ></video>
                            {:else}
                                {#if selectedTimeline.thumbnail}
                                    {#if isVideo(selectedTimeline.thumbnail)}
                                        <!-- svelte-ignore a11y_media_has_caption -->
                                        <video
                                            src={selectedTimeline.thumbnail}
                                            muted
                                            loop
                                            autoplay
                                            class="preview-video"
                                        ></video>
                                    {:else}
                                        <img
                                            src={selectedTimeline.thumbnail}
                                            alt="Thumbnail"
                                        />
                                    {/if}
                                {/if}
                                {#if selectedTimeline.resourceUrl}
                                    <button
                                        class="play-overlay"
                                        onclick={() => (playVideo = true)}
                                        aria-label="Play video"
                                    >
                                        <i class="fa-solid fa-play"></i>
                                    </button>
                                {/if}
                            {/if}
                        </div>
                    {/if}
                    <div class="detail-content">
                        <h3 class="technical-title">
                            {selectedTimeline.fileName}
                        </h3>
                        <p class="body-small">
                            {selectedTimeline.info?.contentText ??
                                selectedTimeline.info?.content?.contentText ??
                                selectedTimeline.info?.description ??
                                selectedTimeline.info?.caption ??
                                "Metadata empty."}
                        </p>
                    </div>
                </div>

                {#if selectedTimeline.resourceUrl}
                    <div class="modal-actions-co">
                        <a
                            href={selectedTimeline.resourceUrl}
                            target="_blank"
                            class="button-secondary"
                            rel="noreferrer"
                        >
                            Open stream
                        </a>
                        <button
                            onclick={() =>
                                handleDownloadMp4(
                                    selectedTimeline!.resourceUrl!,
                                    selectedTimeline!.fileName,
                                    selectedTimeline!.info
                                )}
                            class="button-primary"
                            disabled={!!downloadingJobId}
                        >
                            {#if downloadingUrl === selectedTimeline.resourceUrl}
                                <i class="fa-solid fa-spinner fa-spin"></i> {downloadProgress}%
                            {:else}
                                <i class="fa-solid fa-download"></i> Download MP4
                            {/if}
                        </button>
                    </div>
                {/if}

                {#if selectedTimeline.images.length > 0}
                    <div class="image-inventory">
                        <span class="mono-label mb-3 block"
                            >Visual Assets ({selectedTimeline.images
                                .length})</span
                        >
                        <div class="inventory-grid">
                            {#each selectedTimeline.images as img}
                                <div class="inventory-item">
                                    {#if isVideo(img)}
                                        <!-- svelte-ignore a11y_media_has_caption -->
                                        <video
                                            src={img}
                                            muted
                                            loop
                                            autoplay
                                            class="inventory-video"
                                        ></video>
                                    {:else}
                                        <img
                                            src={img}
                                            alt="Asset"
                                            loading="lazy"
                                        />
                                    {/if}
                                    <div class="item-overlay">
                                        <button
                                            onclick={() => copyToClipboard(img)}
                                            aria-label="Copy image URL"
                                            ><i class="fa-solid fa-copy"
                                            ></i></button
                                        >
                                        <a
                                            href={img}
                                            target="_blank"
                                            aria-label="Open image in new tab"
                                            ><i
                                                class="fa-solid fa-external-link"
                                            ></i></a
                                        >
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
