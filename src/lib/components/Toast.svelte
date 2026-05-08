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

<style>
	.notification-stack {
		position: fixed;
		bottom: 40px;
		right: 40px;
		z-index: 5000;
		display: flex;
		flex-direction: column;
		gap: 16px;
		pointer-events: none;
	}

	.notification-node {
		width: 320px;
		background: var(--co-white);
		border: 1px solid var(--co-hairline);
		border-radius: var(--radius-md);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		padding: 0;
		overflow: hidden;
		pointer-events: auto;
		animation: slide-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	@keyframes slide-in {
		from { transform: translateX(40px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}

	.node-header {
		padding: 12px 20px;
		background: var(--co-stone);
		border-bottom: 1px solid var(--co-hairline);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.notification-node.success .node-header {
		background: #e6f6f0;
		border-bottom-color: #d1eadf;
	}
	.notification-node.success .mono-label {
		color: #008a5d;
	}

	.notification-node.error .node-header {
		background: #fff0ed;
		border-bottom-color: #fce1da;
	}
	.notification-node.error .mono-label {
		color: var(--co-coral);
	}

	.node-close {
		background: none;
		border: none;
		color: var(--co-slate-muted);
		cursor: pointer;
		padding: 4px;
		font-size: 14px;
		transition: color 0.2s;
	}

	.node-close:hover {
		color: var(--co-ink);
	}

	.node-body {
		padding: 20px;
		font-size: 14px;
		line-height: 1.4;
		color: var(--co-ink);
	}
</style>
