<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";

	let email = $state("");
	let password = $state("");
	let error = $state("");
	let loading = $state(false);

	async function handleLogin() {
		console.log("[Login] Starting login process...", { email });
		loading = true;
		error = "";

		try {
			console.log("[Login] Calling supabase.auth.signInWithPassword...");
			const { data, error: err } = await supabase.auth.signInWithPassword(
				{ email, password },
			);

			if (err) {
				console.error("[Login] Supabase auth error:", err);
				error = err.message;
			} else {
				console.log("[Login] Login successful!", {
					user: data.user?.email,
					session: !!data.session,
				});

				// Manually set cookie before redirecting to ensure server sees it immediately
				if (data.session) {
					document.cookie = `sb-session=${JSON.stringify(data.session)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax;`;
					console.log("[Login] Session cookie set.");
				}

				console.log("[Login] Redirecting to /dashboard...");
				goto("/dashboard");
			}
		} catch (e) {
			console.error("[Login] Unexpected error during login:", e);
			error = "An unexpected error occurred.";
		} finally {
			loading = false;
			console.log(
				"[Login] Login process finished. Loading state:",
				loading,
			);
		}
	}
</script>

<div class="access-terminal">
	<header class="terminal-header">
		<span class="mono-label">Authentication Protocol</span>
		<h1 class="hero-display">Access Terminal</h1>
	</header>

	{#if error}
		<div class="status-stream error">
			<div class="status-node danger">
				<i class="fa-solid fa-triangle-exclamation me-2"></i>
				<span class="mono-label">{error.toUpperCase()}</span>
			</div>
		</div>
	{/if}

	<div class="terminal-form">
		<div class="input-section">
			<span class="mono-label">USER_IDENTIFIER</span>
			<div class="technical-input-group">
				<input
					type="email"
					bind:value={email}
					placeholder="admin@cohere.lab"
					disabled={loading}
				/>
			</div>
		</div>

		<div class="input-section">
			<span class="mono-label">SECURITY_TOKEN</span>
			<div class="technical-input-group">
				<input
					type="password"
					bind:value={password}
					placeholder="••••••••"
					disabled={loading}
				/>
			</div>
		</div>

		<button
			class="button-pill-outline w-full mt-8"
			onclick={handleLogin}
			disabled={loading}
		>
			{#if loading}
				<i class="fa-solid fa-spinner fa-spin me-2"></i> INITIALIZING...
			{:else}
				ESTABLISH_SESSION
			{/if}
		</button>
	</div>

	<footer class="terminal-footer">
		<p class="mono-label opacity-30">
			© 2026 RESEARCH OPERATIONS. ALL ACCESS LOGGED.
		</p>
	</footer>
</div>

<style>
	.access-terminal {
		width: 100%;
		max-width: 440px;
		display: flex;
		flex-direction: column;
		gap: 48px;
		animation: fade-in 0.8s ease-out;
		padding: 40px;
	}

	.terminal-header {
		text-align: center;
	}

	.hero-display {
		font-size: 56px;
		margin-top: 8px;
	}

	.status-stream {
		display: flex;
		justify-content: center;
	}

	.status-node.danger {
		background: var(--co-coral);
		color: white;
		padding: 12px 24px;
		border-radius: var(--radius-pill);
		font-size: 11px;
	}

	.terminal-form {
		display: flex;
		flex-direction: column;
		gap: 32px;
		background: var(--co-white);
		padding: 48px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--co-hairline);
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.05);
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.technical-input-group {
		background: var(--co-stone);
		border: 1px solid var(--co-hairline);
		border-radius: var(--radius-sm);
		padding: 4px;
	}

	.technical-input-group input {
		width: 100%;
		background: none;
		border: none;
		padding: 12px 16px;
		font-family: var(--font-body);
		font-size: 15px;
		outline: none;
		color: var(--co-ink);
	}

	.technical-input-group input:focus {
		color: var(--co-blue);
	}

	.w-full {
		width: 100%;
	}
	.mt-8 {
		margin-top: 32px;
	}

	.terminal-footer {
		text-align: center;
	}

	@media (max-width: 640px) {
		.hero-display {
			font-size: 40px;
		}
		.terminal-form {
			padding: 32px;
		}
	}
</style>
