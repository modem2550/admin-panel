<script lang="ts">
	import { toasts } from "$lib/toasts";
	import { proxyUrl } from "$lib/bnk48";
	import type { MemberLive, VODResult, TimelineResult } from "$lib/bnk48";

	import type { Member } from "$lib/types";

	let { data } = $props<{ data: { members: Member[] } }>();
	let selectedMemberId = $state("");

	let searchQuery = $state("");
	let isLoading = $state(false);
	let resultData = $state<{
		lives?: MemberLive[];
		posts?: any[];
		memberName?: string;
		memberId?: number;
		directVod?: VODResult;
		directTimeline?: TimelineResult;
		error?: string;
	} | null>(null);

	let selectedVod = $state<VODResult | null>(null);
	let selectedTimeline = $state<TimelineResult | null>(null);
	let showVodModal = $state(false);
	let showTimelineModal = $state(false);
	let fetchingVodId = $state<string | null>(null);
	let playVideo = $state(false);

	let selectedType = $state("lives");

	// ffmpeg.wasm state
	let downloadProgress = $state<number | null>(null);
	let downloadingUrl = $state<string | null>(null);
	let downloadStatusText = $state<string>("");

	function closeModals() {
		showVodModal = false;
		showTimelineModal = false;
		playVideo = false;
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return "Unknown Date";
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
		const cleanUrl = url.split("?")[0].toLowerCase();
		return (
			cleanUrl.endsWith(".mp4") ||
			cleanUrl.endsWith(".m3u8") ||
			cleanUrl.endsWith(".mov") ||
			cleanUrl.endsWith(".webm")
		);
	}

	let isLoadMoreLoading = $state(false);
	let hasMore = $state(true);

	async function queryMemberData(memberName: string, append = false) {
		if (append) {
			isLoadMoreLoading = true;
		} else {
			isLoading = true;
			resultData = null;
			hasMore = true;
		}
		try {
			const currentSkip =
				append && resultData
					? (selectedType === "posts"
							? resultData.posts?.length
							: resultData.lives?.length) || 0
					: 0;
			let lastId: string | number | undefined;
			if (append && resultData) {
				if (
					selectedType === "posts" &&
					resultData.posts &&
					resultData.posts.length > 0
				) {
					lastId = resultData.posts[resultData.posts.length - 1].id;
				} else if (
					selectedType !== "posts" &&
					resultData.lives &&
					resultData.lives.length > 0
				) {
					lastId = resultData.lives[resultData.lives.length - 1].id;
				}
			}
			const response = await fetch("/api/downloader/search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: memberName,
					type: selectedType,
					skip: currentSkip,
					take: 300,
					lastId,
				}),
			});
			const result = await response.json();
			if (response.ok) {
				if (append && resultData) {
					if (selectedType === "posts") {
						if (result.posts && result.posts.length > 0) {
							resultData.posts = [
								...(resultData.posts || []),
								...result.posts,
							];
							if (result.posts.length < 20) {
								hasMore = false;
							}
						} else {
							hasMore = false;
						}
					} else {
						if (result.lives && result.lives.length > 0) {
							resultData.lives = [
								...(resultData.lives || []),
								...result.lives,
							];
							if (result.lives.length < 20) {
								hasMore = false;
							}
						} else {
							hasMore = false;
						}
					}
				} else {
					resultData = result;
					if (selectedType === "posts") {
						if (resultData?.posts && resultData.posts.length < 20) {
							hasMore = false;
						}
					} else {
						if (resultData?.lives && resultData.lives.length < 20) {
							hasMore = false;
						}
					}
					if (resultData?.directVod) {
						selectedVod = resultData.directVod as VODResult;
						showVodModal = true;
					}
					if (resultData?.directTimeline) {
						selectedTimeline =
							resultData.directTimeline as TimelineResult;
						showTimelineModal = true;
					}
				}
			} else {
				if (!append) {
					resultData = {
						error: result.error || "Failed to query member data",
					};
				} else {
					toasts.add(
						result.error || "Failed to load more items",
						"error",
					);
				}
			}
		} catch (err: any) {
			if (!append) {
				resultData = { error: err.message || "An error occurred" };
			} else {
				toasts.add(err.message || "An error occurred", "error");
			}
		} finally {
			isLoading = false;
			isLoadMoreLoading = false;
		}
	}

	async function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		if (!searchQuery) return;
		selectedMemberId = ""; // clear selection when typing manually
		await queryMemberData(searchQuery.trim());
	}

	async function handleMemberSelect(e: Event) {
		const select = e.target as HTMLSelectElement;
		const name = select.value;
		if (!name) return;
		searchQuery = name;
		await queryMemberData(name);
	}

	async function handleTypeChange() {
		if (searchQuery) {
			await queryMemberData(searchQuery.trim());
		}
	}

	async function handleGetVod(videoId: string) {
		fetchingVodId = videoId;
		try {
			const response = await fetch("/api/downloader/get-vod", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ videoId }),
			});

			const result = await response.json();

			if (response.ok && result.vod) {
				selectedVod = result.vod as VODResult;
				showVodModal = true;
			} else if (result.error) {
				toasts.add(String(result.error), "error");
			} else {
				toasts.add("Failed to fetch VOD", "error");
			}
		} catch (err) {
			toasts.add("An error occurred", "error");
		} finally {
			fetchingVodId = null;
		}
	}

	async function handleGetTimelinePost(
		itemType: string,
		id: number | string,
	) {
		if (!id) return;
		let path = "";
		if (itemType === "content-member-live-playback") {
			await handleGetVod(String(id));
			return;
		} else if (itemType === "content-member-timeline") {
			path = `timeline/content-member-timeline/${id}`;
		} else if (itemType === "content-member-batch-thankyou") {
			path = `timeline/content-member-batch-thankyou/${id}`;
		} else {
			path = `timeline/${id}`;
		}

		fetchingVodId = String(id);
		try {
			const response = await fetch("/api/downloader/search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: path }),
			});

			const result = await response.json();

			if (response.ok && result.directTimeline) {
				selectedTimeline = result.directTimeline as TimelineResult;
				showTimelineModal = true;
			} else if (result.error) {
				toasts.add(String(result.error), "error");
			} else {
				toasts.add("Failed to fetch timeline post", "error");
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

	// ── ffmpeg.wasm download ────────────────────────────────────────────────────

	async function handleDownloadMp4(url: string, fileName: string) {
		if (downloadingUrl) {
			toasts.add("A download is already in progress", "warning");
			return;
		}

		downloadingUrl = url;
		downloadProgress = 0;
		downloadStatusText = "Starting download job...";

		try {
			const response = await fetch("/api/downloads", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url, fileName }),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to start download");
			}

			const jobId = data.jobId;

			const poll = async () => {
				if (!downloadingUrl) return;

				const res = await fetch(`/api/downloads/${jobId}`);
				const resData = await res.json();

				if (!res.ok) {
					throw new Error(resData.error || "Failed to fetch status");
				}

				const job = resData.job;
				downloadProgress = job.progress;

				if (job.status === "processing") {
					downloadStatusText = `Converting on server... ${job.progress}%`;
					setTimeout(poll, 1500);
				} else if (job.status === "queued") {
					downloadStatusText = "Queued on server...";
					setTimeout(poll, 1500);
				} else if (job.status === "completed") {
					downloadStatusText = "Downloading file...";
					downloadProgress = 100;

					const a = document.createElement("a");
					a.href = `/api/downloads/${jobId}/file`;
					a.download = `${fileName}.mp4`;
					a.click();

					toasts.add("Download complete!", "success");

					downloadProgress = null;
					downloadingUrl = null;
					downloadStatusText = "";
				} else if (job.status === "failed") {
					throw new Error(job.error || "Download failed on server");
				}
			};

			poll().catch((err) => {
				console.error("Polling error:", err);
				toasts.add(
					`Download failed: ${err?.message ?? "unknown error"}`,
					"error",
				);
				downloadProgress = null;
				downloadingUrl = null;
				downloadStatusText = "";
			});
		} catch (err: any) {
			console.error("Download error:", err);
			toasts.add(
				`Download failed: ${err?.message ?? "unknown error"}`,
				"error",
			);
			downloadProgress = null;
			downloadingUrl = null;
			downloadStatusText = "";
		}
	}
</script>

<div class="page-shell">
	<section class="download-hero" aria-labelledby="download-title">
		<p class="download-hero__rule" aria-hidden="true">
			────────────────────────────────
		</p>
		<p class="mono-label download-hero__kicker">
			<span class="bracket-muted" aria-hidden="true">[+]</span>
			Technical intelligence
		</p>
		<h1 id="download-title" class="ds-display-xl">Downloader</h1>
		<p class="ds-body-md download-hero__lede">
			Automated extraction and indexing of member broadcast infrastructure
			and media resources.
		</p>
		<p
			class="download-hero__rule download-hero__rule--dim"
			aria-hidden="true"
		>
			────────────────────────────────
		</p>
	</section>

	<div class="downloader-controls-group">
		<div class="technical-select hairline-section">
			<span class="search-glyph ds-caption-md" aria-hidden="true"
				>[o]</span
			>
			<select bind:value={selectedMemberId} onchange={handleMemberSelect}>
				<option value="">-- Select Member --</option>
				{#each data.members || [] as member}
					<option value={member.name}
						>{member.name} ({member.brand})</option
					>
				{/each}
			</select>
		</div>

		<div class="technical-select hairline-section">
			<span class="search-glyph ds-caption-md" aria-hidden="true"
				>[t]</span
			>
			<select bind:value={selectedType} onchange={handleTypeChange}>
				<option value="lives">Lives</option>
				<option value="posts">Posts</option>
			</select>
		</div>

		<form onsubmit={handleSearch} class="playback-search-form">
			<div class="playback-search-field hairline-section">
				<span class="search-glyph ds-caption-md" aria-hidden="true"
					>[~]</span
				>
				<input
					type="text"
					name="name"
					bind:value={searchQuery}
					placeholder="Or enter member name, alias, app URI endpoint…"
					required
					autocomplete="off"
				/>
				<button
					type="submit"
					class="button-primary ds-button-md"
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="ds-busy" aria-hidden="true">[*]</span>
						Wait
					{:else}
						Query
					{/if}
				</button>
			</div>
		</form>
	</div>

	{#if resultData?.error}
		<div class="banner-error hairline-section" role="alert">
			<span class="bracket-danger" aria-hidden="true">[!]</span>
			<span>System Error: {resultData.error}</span>
		</div>
	{/if}

	{#if resultData?.lives}
		<div class="section-divider hairline-section">
			<h2 class="ds-heading-md section-title">
				<span class="bracket-accent" aria-hidden="true">[+]</span>
				{resultData.memberName} Sessions
			</h2>
			<div class="mono-label">
				<span class="bracket-muted" aria-hidden="true">[#]</span>
				Total Nodes: {(resultData.lives as MemberLive[]).length}
			</div>
		</div>

		<div class="technical-grid">
			{#each resultData.lives as live (live.id)}
				<article class="media-card-co hairline-section">
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
								<span class="ds-busy" aria-hidden="true"
									>[*]</span
								>
							{:else}
								<span aria-hidden="true">[&gt;]</span>
							{/if}
						</button>
					</div>
					<div class="card-info">
						<div class="mono-label">
							{formatDate(live.publishedAt)}
						</div>
					</div>
				</article>
			{/each}
		</div>

		{#if hasMore && searchQuery}
			<div class="load-more-container">
				<button
					type="button"
					class="button-secondary load-more-btn"
					onclick={() => queryMemberData(searchQuery, true)}
					disabled={isLoadMoreLoading}
				>
					{#if isLoadMoreLoading}
						<span class="ds-busy" aria-hidden="true">[*]</span>
						Loading...
					{:else}
						Load More
					{/if}
				</button>
			</div>
		{/if}
	{:else if resultData?.posts}
		<div class="section-divider hairline-section">
			<h2 class="ds-heading-md section-title">
				<span class="bracket-accent" aria-hidden="true">[+]</span>
				{resultData.memberName} Posts
			</h2>
			<div class="mono-label">
				<span class="bracket-muted" aria-hidden="true">[#]</span>
				Total Nodes: {resultData.posts.length}
			</div>
		</div>

		<div class="technical-grid">
			{#each resultData.posts as post (post.id)}
				<article class="media-card-co hairline-section">
					<div class="card-media">
						{#if post.thumbnail}
							<img
								src={post.thumbnail}
								alt={post.title || "Post"}
								loading="lazy"
							/>
						{:else if post.images && post.images.length > 0}
							<img
								src={post.images[0]}
								alt={post.title || "Post"}
								loading="lazy"
							/>
						{:else}
							<div class="card-media-placeholder">
								<span
									aria-hidden="true"
									style="font-size: 2rem; opacity: 0.3;"
									>[img]</span
								>
							</div>
						{/if}
						<button
							class="play-trigger"
							onclick={() =>
								handleGetTimelinePost(
									post.itemType,
									post.contentId,
								)}
							disabled={fetchingVodId === String(post.contentId)}
							aria-label="View Post Details"
						>
							{#if fetchingVodId === String(post.contentId)}
								<span class="ds-busy" aria-hidden="true"
									>[*]</span
								>
							{:else}
								<span aria-hidden="true">[&gt;]</span>
							{/if}
						</button>
					</div>
					<div class="card-info">
						<div class="mono-label">
							{formatDate(post.publishedAt)}
						</div>
						<div style="margin-top: 0.25rem;">
							<span
								class="ds-caption-md item-badge"
								style="background: var(--surface-soft); border: 1px solid var(--hairline-strong); padding: 0.1rem 0.35rem; border-radius: var(--radius-interactive); font-size: 10px; color: var(--ash);"
							>
								{post.itemType
									.replace("content-member-", "")
									.toUpperCase()}
							</span>
						</div>
						<h3
							class="technical-title ds-body-sm"
							style="margin-top: 0.5rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-weight: normal; font-size: 0.85rem; line-height: 1.4; color: var(--body);"
							title={post.title}
						>
							{post.title || "No description text provided."}
						</h3>
					</div>
				</article>
			{/each}
		</div>

		{#if hasMore && searchQuery}
			<div class="load-more-container">
				<button
					type="button"
					class="button-secondary load-more-btn"
					onclick={() => queryMemberData(searchQuery, true)}
					disabled={isLoadMoreLoading}
				>
					{#if isLoadMoreLoading}
						<span class="ds-busy" aria-hidden="true">[*]</span>
						Loading...
					{:else}
						Load More
					{/if}
				</button>
			</div>
		{/if}
	{:else if !isLoading && !resultData?.error}
		<div class="empty-state hairline-section">
			<h3 class="ds-heading-md">
				<span class="bracket-muted" aria-hidden="true">[-]</span>
				Null Response
			</h3>
			<p class="ds-body-md empty-copy">
				Enter a valid member identifier to begin technical extraction.
			</p>
		</div>
	{/if}
</div>

{#if showVodModal && selectedVod}
	<div class="modal-overlay" onclick={closeModals} role="presentation">
		<div
			class="contact-form-card hairline-section"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="form-header">
				<div>
					<span class="mono-label">VOD_RESOURCE</span>
					<h2 class="ds-heading-md modal-heading">
						Playback Records
					</h2>
				</div>
				<button
					class="close-trigger"
					onclick={() => (showVodModal = false)}
					aria-label="Close modal"
				>
					<span aria-hidden="true">[x]</span>
				</button>
			</div>

			<div class="technical-details">
				<div class="detail-row" class:is-playing={playVideo}>
					<div
						class="media-preview hairline-section"
						class:is-playing={playVideo}
					>
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
								<span aria-hidden="true">[&gt;]</span>
							</button>
						{/if}
					</div>
					<div class="detail-content">
						<h3 class="technical-title ds-heading-md">
							{selectedVod.fileName}
						</h3>
						<p class="body-small ds-caption-md">
							{selectedVod.info?.description ||
								"Technical description unavailable for this node."}
						</p>
					</div>
				</div>

				<!-- Progress bar -->
				{#if downloadingUrl === selectedVod.resourceUrl && downloadProgress !== null}
					<div class="progress-block hairline-section">
						<div class="progress-header">
							<span class="mono-label">
								<span class="ds-busy" aria-hidden="true"
									>[*]</span
								>
								{downloadStatusText || "Processing..."}
							</span>
							<span class="mono-label">{downloadProgress}%</span>
						</div>
						<div class="progress-track">
							<div
								class="progress-fill"
								style="width: {downloadProgress}%"
							></div>
						</div>
						<p class="ds-caption-md progress-note">
							Processing in your browser — do not close this tab.
						</p>
					</div>
				{/if}

				<div class="modal-actions-co">
					<a
						href={selectedVod.resourceUrl}
						target="_blank"
						class="button-secondary ds-button-md"
						rel="noreferrer"
					>
						Open stream
					</a>
					<button
						onclick={() =>
							handleDownloadMp4(
								selectedVod!.resourceUrl,
								selectedVod!.fileName,
							)}
						class="button-primary ds-button-md"
						disabled={!!downloadingUrl}
					>
						{#if downloadingUrl === selectedVod.resourceUrl}
							<span class="ds-busy" aria-hidden="true">[*]</span>
							{downloadProgress}%
						{:else}
							<span aria-hidden="true">[v]</span>
							Download MP4
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showTimelineModal && selectedTimeline}
	<div class="modal-overlay" onclick={closeModals} role="presentation">
		<div
			class="contact-form-card hairline-section"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="form-header">
				<div>
					<span class="mono-label">TIMELINE_OBJECT</span>
					<h2 class="ds-heading-md modal-heading">
						Extraction Results
					</h2>
				</div>
				<button
					class="close-trigger"
					onclick={closeModals}
					aria-label="Close modal"
				>
					<span aria-hidden="true">[x]</span>
				</button>
			</div>

			<div class="technical-details">
				<div class="detail-row" class:is-playing={playVideo}>
					{#if selectedTimeline.thumbnail || selectedTimeline.resourceUrl}
						<div
							class="media-preview hairline-section"
							class:is-playing={playVideo}
						>
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
										<span aria-hidden="true">[&gt;]</span>
									</button>
								{/if}
							{/if}
						</div>
					{/if}
					<div class="detail-content">
						<h3 class="technical-title ds-heading-md">
							{selectedTimeline.fileName}
						</h3>
						<p class="body-small ds-caption-md">
							{selectedTimeline.info?.contentText ??
								selectedTimeline.info?.content?.contentText ??
								selectedTimeline.info?.description ??
								selectedTimeline.info?.caption ??
								"Metadata empty."}
						</p>
					</div>
				</div>

				{#if selectedTimeline.resourceUrl}
					<!-- Progress bar -->
					{#if downloadingUrl === selectedTimeline.resourceUrl && downloadProgress !== null}
						<div class="progress-block hairline-section">
							<div class="progress-header">
								<span class="mono-label">
									<span class="ds-busy" aria-hidden="true"
										>[*]</span
									>
									{downloadStatusText || "Processing..."}
								</span>
								<span class="mono-label"
									>{downloadProgress}%</span
								>
							</div>
							<div class="progress-track">
								<div
									class="progress-fill"
									style="width: {downloadProgress}%"
								></div>
							</div>
							<p class="ds-caption-md progress-note">
								Processing in your browser — do not close this
								tab.
							</p>
						</div>
					{/if}

					<div class="modal-actions-co">
						<a
							href={selectedTimeline.resourceUrl}
							target="_blank"
							class="button-secondary ds-button-md"
							rel="noreferrer"
						>
							Open stream
						</a>
						<button
							onclick={() =>
								handleDownloadMp4(
									selectedTimeline!.resourceUrl!,
									selectedTimeline!.fileName,
								)}
							class="button-primary ds-button-md"
							disabled={!!downloadingUrl}
						>
							{#if downloadingUrl === selectedTimeline.resourceUrl}
								<span class="ds-busy" aria-hidden="true"
									>[*]</span
								>
								{downloadProgress}%
							{:else}
								<span aria-hidden="true">[v]</span>
								Download MP4
							{/if}
						</button>
					</div>
				{/if}

				{#if selectedTimeline.images.length > 0}
					<div class="image-inventory hairline-section">
						<span class="mono-label inventory-label">
							<span class="bracket-muted" aria-hidden="true"
								>[+]</span
							>
							Visual Assets ({selectedTimeline.images.length})
						</span>
						<div class="inventory-grid">
							{#each selectedTimeline.images as img}
								<div class="inventory-item hairline-section">
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
											class="overlay-btn"
										>
											<span aria-hidden="true">[c]</span>
										</button>
										<a
											href={img}
											target="_blank"
											aria-label="Open image in new tab"
											class="overlay-btn"
										>
											<span aria-hidden="true">[^]</span>
										</a>
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
	.page-shell {
		display: flex;
		flex-direction: column;
		gap: var(--section-rhythm);
	}

	.load-more-container {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
		margin-bottom: 2rem;
	}

	.load-more-btn {
		min-width: 160px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.downloader-controls-group {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.downloader-controls-group {
			grid-template-columns: 240px 140px 1fr;
		}
	}

	.technical-select select {
		width: 100%;
		border: none;
		background: transparent;
		color: var(--body);
		padding: 0.75rem 0.65rem;
		font: inherit;
		outline: none;
		cursor: pointer;
		appearance: none;
	}

	.downloader-controls-group .technical-select {
		display: flex;
		align-items: center;
		padding-right: 0.5rem;
	}

	.hairline-section {
		border: 1px solid var(--hairline);
		border-radius: var(--radius-section);
		background: var(--surface-card);
		box-shadow: none;
	}

	.download-hero {
		padding: 1.25rem 1.5rem;
		background: var(--surface-soft);
		border: 1px solid var(--hairline);
		border-radius: var(--radius-section);
	}

	.download-hero__rule {
		margin: 0 0 0.5rem;
		font-size: 12px;
		line-height: 1.2;
		color: var(--ash);
		letter-spacing: 0.12em;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: clip;
	}

	.download-hero__rule--dim {
		margin: 0.75rem 0 0;
		opacity: 0.65;
	}

	.download-hero__kicker {
		margin: 0 0 0.35rem;
	}
	.download-hero__lede {
		margin: 0.75rem 0 0;
		max-width: 52ch;
	}
	.bracket-muted {
		margin-right: 0.35em;
		color: var(--ash);
	}
	.bracket-accent {
		margin-right: 0.35em;
		color: var(--accent);
	}
	.bracket-danger {
		margin-right: 0.5rem;
		color: var(--danger);
		font-weight: 700;
	}
	.playback-search-form {
		margin: 0;
	}

	.playback-search-field {
		display: flex;
		align-items: stretch;
		overflow: hidden;
	}

	.search-glyph {
		display: flex;
		align-items: center;
		padding-left: 0.85rem;
		color: var(--stone);
		user-select: none;
	}

	.playback-search-field input {
		flex: 1;
		min-width: 0;
		border: none;
		padding: 0.75rem 0.65rem;
		font: inherit;
		background: transparent;
		color: var(--body);
		outline: none;
	}

	.playback-search-field input::placeholder {
		color: var(--ash);
	}

	.playback-search-field .button-primary {
		align-self: center;
		margin: 0.35rem;
		border-left: 1px solid var(--hairline);
	}

	.banner-error {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		border-color: var(--danger);
		background: var(--surface-soft);
		color: var(--body);
	}

	.section-divider {
		padding: 1rem 1.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.section-title {
		margin: 0;
	}

	.technical-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1.25rem;
	}

	.media-card-co {
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.card-media {
		position: relative;
		aspect-ratio: 16 / 10;
		background: var(--surface-soft);
	}

	.card-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.card-media-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-soft);
		color: var(--ash);
	}

	.play-trigger {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		width: 2.25rem;
		height: 2.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--hairline-strong);
		border-radius: var(--radius-interactive);
		background: var(--surface-card);
		color: var(--ink);
		cursor: pointer;
		font: inherit;
	}

	.play-trigger:hover:not(:disabled) {
		border-color: var(--ink);
		background: var(--surface-soft);
	}
	.play-trigger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.card-info {
		padding: 0.75rem 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.technical-title {
		margin: 0;
		font-size: var(--fs-heading-md);
		line-height: var(--lh-heading-md);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty-state {
		padding: 1.5rem 1.25rem;
	}
	.empty-copy {
		margin: 0.75rem 0 0;
		max-width: 48ch;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.28);
	}

	.contact-form-card {
		width: min(720px, 100%);
		max-height: min(90vh, 900px);
		overflow: auto;
		background: var(--surface-card);
	}

	.form-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.15rem;
		border-bottom: 1px solid var(--hairline);
		background: var(--surface-soft);
	}

	.modal-heading {
		margin: 0.35rem 0 0;
	}

	.close-trigger {
		border: 1px solid var(--hairline-strong);
		border-radius: var(--radius-interactive);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		line-height: 1;
		padding: 0.35rem 0.55rem;
	}

	.close-trigger:hover {
		background: var(--surface-card);
		border-color: var(--ink);
	}

	.technical-details {
		padding: 1rem 1.15rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.detail-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.detail-row:not(.is-playing) {
			grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
		}
	}

	.media-preview {
		position: relative;
		background: var(--surface-soft);
		overflow: hidden;
		min-height: 140px;
	}

	.media-preview img,
	.media-preview video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.media-preview.is-playing {
		min-height: 200px;
	}

	.play-overlay {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--hairline-strong);
		border-radius: var(--radius-interactive);
		background: var(--surface-card);
		color: var(--ink);
		cursor: pointer;
		font: inherit;
	}

	.play-overlay:hover {
		border-color: var(--ink);
	}
	.detail-content .body-small {
		margin: 0.5rem 0 0;
		color: var(--mute);
	}
	.modal-actions-co {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	/* Progress bar */
	.progress-block {
		padding: 0.85rem 1rem;
		background: var(--surface-soft);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.progress-track {
		height: 4px;
		background: var(--hairline);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.progress-note {
		margin: 0.5rem 0 0;
		color: var(--ash);
	}

	/* Images */
	.image-inventory {
		padding: 1rem;
	}
	.inventory-label {
		display: block;
		margin-bottom: 0.75rem;
	}

	.inventory-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.65rem;
	}

	.inventory-item {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--surface-soft);
	}

	.inventory-item img,
	.inventory-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.item-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		background: rgba(253, 252, 252, 0.88);
		opacity: 0;
		transition: opacity 0.12s ease;
	}

	.inventory-item:hover .item-overlay,
	.inventory-item:focus-within .item-overlay {
		opacity: 1;
	}

	.overlay-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		padding: 0 0.35rem;
		border: 1px solid var(--hairline-strong);
		border-radius: var(--radius-interactive);
		background: var(--surface-card);
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		cursor: pointer;
	}

	.overlay-btn:hover {
		border-color: var(--ink);
	}

	.ds-busy {
		animation: coBusy 0.85s ease-in-out infinite;
	}

	@keyframes coBusy {
		50% {
			opacity: 0.25;
		}
	}

	:global(.dark) .item-overlay {
		background: rgba(20, 18, 18, 0.88);
	}
</style>
