<script lang="ts">
	import { onMount } from "svelte";

	let { data } = $props();

	let latestProduct = $state<{ id: string; url: string } | null>(null);
	let latestGroup = $state<{ id: string; url: string } | null>(null);
	let loadingAssets = $state(true);

	onMount(async () => {
		try {
			const [p, g] = await Promise.all([
				fetch("/api/check-assets/latest?type=product").then((r) =>
					r.json(),
				),
				fetch("/api/check-assets/latest?type=group").then((r) =>
					r.json(),
				),
			]);
			latestProduct = p;
			latestGroup = g;
		} catch (e) {
			console.error("Failed to load dashboard assets", e);
		} finally {
			loadingAssets = false;
		}
	});
</script>

<div class="page-shell">
	<div class="co-page-hero">
		<div class="co-page-hero__main">
			<span class="mono-label">Operational Overview</span>
			<h1 class="hero-display">Dashboard</h1>
			<p class="body-large">
				High-level counts, the next scheduled activity, and a snapshot
				of the newest indexed media — white surface, rule-based
				hierarchy.
			</p>
		</div>
	</div>

	<div class="stats-grid">
		<div class="product-stat">
			<span class="mono-label">Network Scope</span>
			<div class="stat-main">
				<span class="stat-value">{data.membersCount}</span>
				<span class="stat-unit">Members indexed</span>
			</div>
		</div>
		<div class="product-stat">
			<span class="mono-label">Activity flux</span>
			<div class="stat-main">
				<span class="stat-value">{data.eventsCount}</span>
				<span class="stat-unit">Total activities</span>
			</div>
		</div>
		<div class="product-stat product-stat--accent">
			<span class="mono-label">Imminent event</span>
			<div class="stat-main">
				{#if data.nextEvent}
					<span class="stat-title">{data.nextEvent.title}</span>
					<span class="stat-meta">{data.nextEvent.date}</span>
				{:else}
					<span class="stat-dash">—</span>
				{/if}
			</div>
		</div>
	</div>

	<section class="asset-stream">
		<div class="section-header">
			<h2 class="card-heading">Asset registry</h2>
			<a href="/assets" class="button-secondary"
				>Explore repository <i class="fa-solid fa-arrow-right ms-1"
				></i></a
			>
		</div>

		<div class="media-preview-row">
			{#if loadingAssets}
				<div class="preview-col">
					<div class="skeleton-media mb-3"></div>
					<div class="skeleton-text"></div>
				</div>
				<div class="preview-col">
					<div class="skeleton-media mb-3"></div>
					<div class="skeleton-text"></div>
				</div>
				<div class="preview-col">
					<div class="skeleton-media mb-3"></div>
					<div class="skeleton-text"></div>
				</div>
			{:else}
				{#if latestProduct && latestProduct.url}
					<div class="preview-col">
						<div class="preview-media">
							<img src={latestProduct.url} alt="Latest product" />
						</div>
						<div class="preview-info">
							<span class="mono-label">
								PRD-{latestProduct.id
									.toString()
									.padStart(4, "0")}
							</span>
							<h3 class="feature-heading">
								Latest product media
							</h3>
						</div>
					</div>
				{/if}

				{#if latestGroup && latestGroup.url}
					<div class="preview-col">
						<div class="preview-media">
							<img src={latestGroup.url} alt="Latest group" />
						</div>
						<div class="preview-info">
							<span class="mono-label">
								GRP-{latestGroup.id.toString().padStart(4, "0")}
							</span>
							<h3 class="feature-heading">
								Latest collective media
							</h3>
						</div>
					</div>
				{/if}
				{#if data.champSplashUrl}
					<div class="preview-col">
						<div class="preview-media">
							<img
								src={data.champSplashUrl}
								alt="Champ of the Week Splash"
								class="splash-image"
							/>
						</div>
						<div class="preview-info">
							<span class="mono-label"> Banner </span>
							<h3 class="feature-heading">Champ of the Week</h3>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</section>
</div>

<style>
	.splash-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.section-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		gap: 1rem;
	}

	.asset-stream .section-header {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--hairline);
	}

	.media-preview-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 2rem;
	}

	.preview-media {
		border-radius: var(--radius-interactive);
		overflow: hidden;
		aspect-ratio: 1/1;
		background: var(--surface-dark);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
