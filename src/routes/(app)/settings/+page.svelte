<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	let user = $state<any>(null);

	onMount(async () => {
		const { data: { user: u } } = await supabase.auth.getUser();
		user = u;
	});
</script>

<div class="page-container">
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
			<section class="config-section">
				<header class="section-header">
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

			<section class="config-section">
				<header class="section-header">
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
	.page-container {
		animation: fade-in 0.6s ease-out;
	}

	.page-header {
		margin-bottom: 80px;
	}

	.hero-display {
		font-size: 72px;
		line-height: 1.0;
		margin: 8px 0 24px;
	}

	.body-large {
		font-size: 18px;
		color: var(--co-slate-muted);
		max-width: 600px;
	}

	.config-surface {
		display: flex;
		flex-direction: column;
		gap: 64px;
		margin-bottom: 120px;
	}

	.config-section {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--co-ink);
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
		border-color: var(--co-blue);
		background: var(--co-white);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
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

	/* Status Stream */
	.status-stream {
		display: flex;
		justify-content: center;
		margin: 80px 0;
	}

	.status-node {
		background: var(--co-black);
		color: var(--co-white);
		padding: 12px 24px;
		border-radius: var(--radius-pill);
		display: flex;
		align-items: center;
		font-size: 12px;
	}

	@media (max-width: 768px) {
		.hero-display { font-size: 48px; }
		.section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
	}
</style>
