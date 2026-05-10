<script lang="ts">
	let { children } = $props();
</script>

<div class="auth-layout-bg">
	{@render children()}
</div>

<style>
	.auth-layout-bg {
		min-height: 100vh;
		background: var(--co-stone);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}
</style>
