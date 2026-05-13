<script lang="ts">
	import { onMount } from "svelte";

	let { data } = $props();

	let latestProduct = $state<{ id: string; url: string } | null>(null);
	let latestGroup = $state<{ id: string; url: string } | null>(null);
	let loadingAssets = $state(true);

	onMount(async () => {
		try {
			const [p, g] = await Promise.all([
				fetch("/api/check-assets/latest?type=product").then((r) => r.json()),
				fetch("/api/check-assets/latest?type=group").then((r) => r.json()),
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
				High-level counts, the next scheduled activity, and a snapshot of
				the newest indexed media — white surface, rule-based hierarchy.
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
				>Explore repository <i class="fa-solid fa-arrow-right ms-1"></i></a
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
			{:else}
				{#if latestProduct && latestProduct.url}
					<div class="preview-col">
						<div class="preview-media">
							<img src={latestProduct.url} alt="Latest product" />
						</div>
						<div class="preview-info">
							<span class="mono-label">
								PRD-{latestProduct.id.toString().padStart(4, "0")}
							</span>
							<h3 class="feature-heading">Latest product media</h3>
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
							<h3 class="feature-heading">Latest collective media</h3>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</section>
</div>