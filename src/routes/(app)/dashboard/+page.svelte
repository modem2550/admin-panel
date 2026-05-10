<script lang="ts">
	import { onMount } from "svelte";
	import type { PageData } from "./$types";

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
	<header class="page-header dashboard-header">
		<div class="header-split">
			<div class="header-text">
				<span class="mono-label">Operational Overview</span>
				<h1 class="hero-display">Dashboard</h1>
			</div>
			<div class="header-visual">
				<div class="visual-grid"></div>
				<div class="visual-pulse"></div>
				<div class="visual-data-stream">
					{#each Array(5) as _, i}
						<div
							class="stream-line"
							style="--delay: {i * 0.8}s; --x: {i * 20}%"
						></div>
					{/each}
				</div>
			</div>
		</div>
	</header>

	<div class="stats-grid">
		<div class="card-cohere stat-node">
			<span class="mono-label">Network Scope</span>
			<div class="stat-main">
				<span class="stat-value">{data.membersCount}</span>
				<span class="stat-unit">Members Indexed</span>
			</div>
		</div>
		<div class="card-cohere stat-node">
			<span class="mono-label">Activity Flux</span>
			<div class="stat-main">
				<span class="stat-value">{data.eventsCount}</span>
				<span class="stat-unit">Total Activities</span>
			</div>
		</div>
		<div class="card-cohere stat-node highlight">
			<span class="mono-label">Imminent Event</span>
			<div class="stat-main">
				{#if data.nextEvent}
					<span class="stat-title">{data.nextEvent.title}</span>
					<span class="stat-meta">{data.nextEvent.date}</span>
				{:else}
					<span class="stat-value">—</span>
				{/if}
			</div>
		</div>
	</div>

	<section class="asset-stream">
		<div class="section-header">
			<h2 class="card-heading">Asset Registry</h2>
			<a href="/assets" class="button-secondary"
				>Explore Repository <i class="fa-solid fa-arrow-right ms-1"
				></i></a
			>
		</div>

		<div class="row">
			{#if loadingAssets}
				<div class="col col-md-3">
					<div class="skeleton-media mb-3"></div>
					<div class="skeleton-text"></div>
				</div>
				<div class="col col-md-3">
					<div class="skeleton-media mb-3"></div>
					<div class="skeleton-text"></div>
				</div>
			{:else}
				{#if latestProduct && latestProduct.url}
					<div
						class="col col-md-3 d-flex justify-content-center flex-column gap-3"
					>
						<div class="preview-media">
							<img
								src={latestProduct.url}
								alt="Latest Product"
							/>
						</div>
						<div class="preview-info">
							<span class="mono-label"
								>PRD-{latestProduct.id
									.toString()
									.padStart(4, "0")}</span
							>
							<h3 class="technical-title">Latest Product Media</h3>
						</div>
					</div>
				{/if}

				{#if latestGroup && latestGroup.url}
					<div
						class="col col-md-3 d-flex justify-content-center flex-column gap-3"
					>
						<div class="preview-media">
							<img
								src={latestGroup.url}
								alt="Latest Group"
							/>
						</div>
						<div class="preview-info">
							<span class="mono-label"
								>GRP-{latestGroup.id
									.toString()
									.padStart(4, "0")}</span
							>
							<h3 class="technical-title">Latest Collective Media</h3>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</section>
</div>

<style>
	.header-split {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 40px;
	}

	.header-text {
		flex: 1;
	}

	.header-visual {
		flex: 1;
		height: 320px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		position: relative;
		border: 1px solid var(--co-hairline);
	}

	.visual-grid {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(
				rgba(255, 255, 255, 0.05) 1px,
				transparent 1px
			),
			linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.05) 1px,
				transparent 1px
			);
		background-size: 30px 30px;
		opacity: 0.5;
	}

	.visual-pulse {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 150%;
		height: 150%;
		background: radial-gradient(
			circle at center,
			var(--co-blue) 0%,
			transparent 70%
		);
		transform: translate(-50%, -50%);
		opacity: 0.1;
		filter: blur(60px);
		animation: pulse-glow 8s infinite alternate ease-in-out;
	}

	.visual-data-stream {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.stream-line {
		position: absolute;
		top: -100%;
		width: 1px;
		height: 40%;
		background: linear-gradient(
			to bottom,
			transparent,
			var(--co-blue),
			transparent
		);
		left: var(--x);
		animation: data-fall 4s infinite linear;
		animation-delay: var(--delay);
		opacity: 0.3;
	}

	@keyframes pulse-glow {
		from {
			opacity: 0.05;
			transform: translate(-50%, -50%) scale(0.9);
		}
		to {
			opacity: 0.15;
			transform: translate(-50%, -50%) scale(1.1);
		}
	}

	@keyframes data-fall {
		from {
			top: -100%;
		}
		to {
			top: 200%;
		}
	}

	.header-visual::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			var(--co-canvas) 0%,
			transparent 20%,
			transparent 80%,
			var(--co-canvas) 100%
		);
		pointer-events: none;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 24px;
		margin-bottom: 80px;
	}

	.stat-node {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 32px !important;
	}

	.stat-node.highlight {
		background: var(--co-stone);
	}

	.stat-main {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 48px;
		font-family: var(--font-display);
		font-weight: 500;
		line-height: 1;
		color: var(--co-black);
	}
	:global(.dark) .stat-value {
		color: var(--co-white);
	}

	.stat-unit {
		font-size: 14px;
		color: var(--co-slate-muted);
		margin-top: 8px;
	}

	.stat-title {
		font-size: 24px;
		font-weight: 500;
		color: var(--co-black);
		line-height: 1.2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	:global(.dark) .stat-title {
		color: var(--co-white);
	}

	.stat-meta {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--co-slate-muted);
		margin-top: 8px;
	}

	.asset-stream {
		margin-top: 80px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 40px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--co-hairline);
	}

	.preview-media {
		width: 100%;
		background: var(--co-stone);
		border-radius: var(--radius-lg);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-media img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.preview-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.technical-title {
		font-size: 20px;
		margin: 0;
	}

	.skeleton-media {
		width: 100%;
		aspect-ratio: 1;
		background: var(--co-stone);
		border-radius: var(--radius-lg);
		position: relative;
		overflow: hidden;
	}

	.skeleton-text {
		width: 60%;
		height: 20px;
		background: var(--co-stone);
		border-radius: 4px;
		position: relative;
		overflow: hidden;
	}

	.skeleton-media::after,
	.skeleton-text::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.05),
			transparent
		);
		animation: skeleton-shimmer 1.5s infinite;
	}

	@keyframes skeleton-shimmer {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(100%);
		}
	}

	@media (max-width: 900px) {
		.header-split {
			flex-direction: column;
			align-items: flex-start;
			gap: 32px;
		}
		.header-visual {
			width: 100%;
			height: 240px;
		}
	}

	@media (max-width: 768px) {
		.header-visual {
			height: 180px;
		}
	}
</style>
