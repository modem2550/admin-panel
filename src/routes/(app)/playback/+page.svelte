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

<div class="page-container">
    <header class="page-header">
        <div class="header-left">
            <span class="mono-label">Technical Intelligence</span>
            <h1 class="hero-display">Playback</h1>
            <p class="body-large">
                Automated extraction and indexing of member broadcast
                infrastructure and media resources.
            </p>
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
            class="technical-search"
        >
            <div class="search-field">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                    type="text"
                    name="name"
                    placeholder="Member alias or App URI endpoint..."
                    required
                    autocomplete="off"
                />
                <button
                    type="submit"
                    class="button-pill-outline"
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
    </header>

    {#if form?.error}
        <div class="error-node">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>System Error: {form.error}</span>
        </div>
    {/if}

    {#if form?.lives}
        <div class="results-technical-header">
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
        <div class="empty-technical-state">
            <i class="fa-solid fa-database mb-3 opacity-20"></i>
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
                    class="close-btn"
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

                <div class="technical-links">
                    <div class="link-item">
                        <label class="mono-label" for="vod-endpoint"
                            >Endpoint URL</label
                        >
                        <div class="input-group-technical">
                            <input
                                id="vod-endpoint"
                                readonly
                                value={selectedVod.resourceUrl}
                            />
                            <button
                                onclick={() =>
                                    copyToClipboard(selectedVod!.resourceUrl)}
                                aria-label="Copy URL"
                            >
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="modal-actions-co">
                    <a
                        href={selectedVod.resourceUrl}
                        target="_blank"
                        class="button-pill-outline"
                    >
                        Initialize Stream
                    </a>
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
                    class="close-btn"
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
                            class="button-pill-outline"
                        >
                            Run Payload
                        </a>
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

<style>
    .page-container {
        animation: fade-in 0.6s ease-out;
    }

    .page-header {
        margin-bottom: 80px;
    }

    .hero-display {
        font-size: 72px;
        line-height: 1;
        margin: 8px 0 24px;
    }

    .body-large {
        font-size: 18px;
        color: var(--co-slate-muted);
        max-width: 600px;
        margin-bottom: 48px;
    }

    .technical-search {
        max-width: 800px;
    }

    .search-field {
        display: flex;
        align-items: center;
        background: var(--co-stone);
        border: 1px solid var(--co-hairline);
        border-radius: var(--radius-sm);
        padding: 8px 8px 8px 24px;
        gap: 16px;
    }

    .search-field i {
        color: var(--co-slate-muted);
    }

    .search-field input {
        flex: 1;
        background: transparent;
        border: none;
        font-family: var(--font-body);
        font-size: 16px;
        color: var(--co-ink);
        outline: none;
    }

    .error-node {
        background: #fff1f1;
        border: 1px solid #ffcfcf;
        color: #b30000;
        padding: 16px 24px;
        border-radius: var(--radius-sm);
        margin-bottom: 48px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: var(--font-mono);
        font-size: 13px;
    }

    :global(.dark) .error-node {
        background: #2a0a0a;
        border-color: #4a1a1a;
        color: #ff8080;
    }

    .results-technical-header {
        border-bottom: 1px solid var(--co-hairline);
        padding-bottom: 24px;
        margin-bottom: 40px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }

    .card-heading {
        font-size: 32px;
        margin: 0;
    }

    .technical-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 10px;
        margin-bottom: 100px;
    }

    .media-card-co {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .media-card-co .card-media {
        width: 100%;
        aspect-ratio: 16/9;
        border-radius: var(--radius-md);
        overflow: hidden;
        position: relative;
        background: var(--co-stone);
    }

    .media-card-co .card-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .media-card-co:hover .card-media img {
        transform: scale(1.05);
    }

    .play-trigger {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        border: none;
        color: white;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
        cursor: pointer;
    }

    .media-card-co:hover .play-trigger {
        opacity: 1;
    }

    .technical-title {
        font-size: 18px;
        font-weight: 500;
        margin: 8px 0 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .empty-technical-state {
        padding: 120px 0;
        text-align: center;
        color: var(--co-slate-muted);
    }

    .empty-technical-state i {
        font-size: 64px;
    }

    /* Modal Styling */
    .technical-details {
        display: flex;
        flex-direction: column;
        gap: 40px;
    }

    .detail-row {
        display: flex;
        gap: 32px;
        transition: all 0.3s ease;
    }

    .detail-row.is-playing {
        flex-direction: column;
    }

    .media-preview {
        width: 240px;
        flex-shrink: 0;
        border-radius: var(--radius-md);
        overflow: hidden;
        border: 1px solid var(--co-hairline);
        position: relative;
        background: var(--co-stone);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .media-preview.is-playing {
        width: 100%;
        max-width: 600px;
        aspect-ratio: 16/9;
    }

    .media-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .preview-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: black;
    }

    .play-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        border: none;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        cursor: pointer;
        transition: all 0.2s;
        backdrop-filter: blur(2px);
    }

    .play-overlay:hover {
        background: rgba(0, 0, 0, 0.5);
        font-size: 48px;
    }

    .play-overlay i {
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }

    .image-inventory {
        padding-top: 40px;
        border-top: 1px solid var(--co-hairline);
    }

    .inventory-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 16px;
    }

    .inventory-item {
        aspect-ratio: 1/1;
        border-radius: var(--radius-sm);
        overflow: hidden;
        position: relative;
        background: var(--co-stone);
        border: 1px solid var(--co-hairline);
    }

    .inventory-item img,
    .inventory-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .inventory-item:hover img,
    .inventory-item:hover .inventory-video {
        transform: scale(1.1);
    }

    .item-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        opacity: 0;
        transition: opacity 0.3s;
    }

    .inventory-item:hover .item-overlay {
        opacity: 1;
    }

    .item-overlay button,
    .item-overlay a {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: white;
        border: none;
        color: black;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.2s;
    }

    .item-overlay button:hover,
    .item-overlay a:hover {
        transform: scale(1.2);
    }

    @media (max-width: 640px) {
        .hero-display {
            font-size: 48px;
        }
    }
</style>
