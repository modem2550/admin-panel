<script lang="ts">
	import { toasts } from '$lib/toasts';
</script>

<div class="notification-stack">
	{#each $toasts as toast (toast.id)}
		<div class="notification-node {toast.type}" role="alert">
			<header class="node-header">
				<span class="mono-label">{toast.type?.toUpperCase() || 'SYSTEM_LOG'}</span>
				<button 
					class="node-close" 
					aria-label="Dismiss" 
					onclick={() => toasts['_remove']?.(toast.id)}
				>
					<i class="fa-solid fa-xmark"></i>
				</button>
			</header>
			<div class="node-body">
				{toast.message}
			</div>
		</div>
	{/each}
</div>
