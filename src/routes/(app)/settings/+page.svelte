<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	let user = $state<any>(null);

	onMount(async () => {
		const { data: { user: u } } = await supabase.auth.getUser();
		user = u;
	});
</script>

<div class="page-shell">
	<header class="page-header">
		<div class="header-left">
			<span class="mono-label">Environment Config</span>
			<h1 class="hero-display">System Parameters</h1>
			<p class="body-large">
				Configuration of administrative credentials, security protocols, and platform environment variables.
			</p>
		</div>
	</header>

	<div class="config-surface">
		{#if user}
			<section class="co-panel-section config-section">
				<header class="co-section-head">
					<h2 class="technical-title">User Identity</h2>
					<span class="mono-label opacity-50">NODE_AUTH_ID: {user.id.substring(0, 8)}...</span>
				</header>

				<div class="config-grid">
					<div class="config-item">
						<div class="item-meta">
							<span class="mono-label">IDENTIFIER</span>
							<span class="status-indicator active">VERIFIED</span>
						</div>
						<div class="item-content">
							<div class="technical-value">{user.email}</div>
						</div>
					</div>

					<div class="config-item">
						<div class="item-meta">
							<span class="mono-label">GLOBAL_UUID</span>
						</div>
						<div class="item-content">
							<div class="technical-value mono-text">{user.id}</div>
						</div>
					</div>

					<div class="config-item">
						<div class="item-meta">
							<span class="mono-label">ROLE_ASSIGNMENT</span>
						</div>
						<div class="item-content">
							<div class="technical-value">Administrative_Superuser</div>
						</div>
					</div>
				</div>
			</section>

			<section class="co-panel-section config-section">
				<header class="co-section-head">
					<h2 class="technical-title">Security Protocols</h2>
				</header>

				<div class="config-grid">
					<div class="config-item">
						<div class="item-meta">
							<span class="mono-label">SESSION_PERSISTENCE</span>
						</div>
						<div class="item-content">
							<div class="technical-value">Active / 30_DAY_EXPIRY</div>
						</div>
					</div>
					
					<div class="config-item">
						<div class="item-meta">
							<span class="mono-label">SUPABASE_SYNC</span>
						</div>
						<div class="item-content">
							<div class="technical-value">ESTABLISHED</div>
						</div>
					</div>
				</div>
			</section>
		{:else}
			<div class="status-stream">
				<div class="status-node">
					<i class="fa-solid fa-spinner fa-spin me-3 opacity-50"></i>
					<span class="mono-label">FETCHING_IDENTITY_RECORDS...</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.config-surface {
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 4vw, 3rem);
		margin-bottom: clamp(3rem, 8vw, 5rem);
	}

	.config-section {
		gap: 1.5rem;
	}

	.config-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 32px;
	}

	.config-item {
		background: var(--co-stone);
		padding: 32px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--co-hairline);
		display: flex;
		flex-direction: column;
		gap: 24px;
		transition: all 0.3s;
	}

	.config-item:hover {
		border-color: color-mix(in srgb, var(--co-blue) 45%, var(--co-hairline));
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .config-item:hover {
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
	}

	.item-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.technical-value {
		font-family: var(--font-display);
		font-size: 20px;
		font-weight: 500;
		color: var(--co-ink);
	}

	.mono-text {
		font-family: var(--font-mono);
		font-size: 13px;
		word-break: break-all;
		color: var(--co-slate-muted);
	}

	.status-indicator {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 4px;
	}

	.status-indicator.active {
		background: #e6f6f0;
		color: #008a5d;
	}

	@media (max-width: 768px) {
		.co-section-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
