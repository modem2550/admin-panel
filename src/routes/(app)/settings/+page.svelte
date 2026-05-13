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
	<div class="co-page-hero">
		<div class="co-page-hero__main">
			<span class="mono-label">Environment config</span>
			<h1 class="hero-display">System parameters</h1>
			<p class="body-large">
				Configuration of administrative credentials, security protocols, and platform environment variables.
			</p>
		</div>
	</div>

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