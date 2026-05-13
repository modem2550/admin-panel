<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";

	let email = $state("");
	let password = $state("");
	let error = $state("");
	let loading = $state(false);

	async function handleLogin() {
		if (import.meta.env.DEV) console.log("--- [Login] Sequence Started ---");
		
		// Manual sync for some password managers that don't trigger events
		const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
		const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
		
		const currentEmail = email.trim() || (emailInput?.value || "").trim();
		const currentPassword = password.trim() || (passwordInput?.value || "").trim();

		if (import.meta.env.DEV) {
			console.log("[Login] Step 1: Credentials Validation", { 
				emailProvided: !!currentEmail,
				passwordProvided: !!currentPassword,
				source: email.trim() ? "Svelte State" : "DOM Direct"
			});
		}

		if (!currentEmail || !currentPassword) {
			if (import.meta.env.DEV) console.warn("[Login] Aborted: Missing credentials");
			error = "Identification and security token required.";
			return;
		}

		loading = true;
		error = "";

		try {
			if (import.meta.env.DEV) console.log("[Login] Step 2: Authenticating with Supabase...");
			const { data, error: err } = await supabase.auth.signInWithPassword({
				email: currentEmail,
				password: currentPassword
			});

			if (err) {
				if (import.meta.env.DEV) console.error("[Login] Step 2 Failed: Supabase Auth", err.message);
				error = err.message;
			} else {
				if (import.meta.env.DEV) console.log("[Login] Step 2 Success: Credentials verified");
				
				if (data.session) {
					if (import.meta.env.DEV) console.log("[Login] Step 3: Synchronizing server session...");
					const res = await fetch("/api/auth/session", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							access_token: data.session.access_token,
							refresh_token: data.session.refresh_token,
						}),
					});
					
					if (res.ok) {
						if (import.meta.env.DEV) console.log("[Login] Step 3 Success: Server session established");
					} else {
						if (import.meta.env.DEV) console.error("[Login] Step 3 Failed: Server session API error", res.status);
						error = "Could not establish server session. Try again.";
						return;
					}
				}

				if (import.meta.env.DEV) console.log("[Login] Step 4: Finalizing and redirecting...");
				await goto("/dashboard", { invalidateAll: true });
				if (import.meta.env.DEV) console.log("--- [Login] Sequence Completed ---");
			}
		} catch (e) {
			if (import.meta.env.DEV) console.error("[Login] Step 2-4 Failed: Unexpected Error", e);
			error = "An unexpected error occurred.";
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-shell">
	<header class="auth-terminal-header">
		<span class="mono-label">Authentication Protocol</span>
		<h1 class="hero-display hero-display--auth">Access Terminal</h1>
	</header>

	{#if error}
		<div class="status-stream">
			<div class="status-node status-node--danger">
				<i class="fa-solid fa-triangle-exclamation me-2"></i>
				<span class="mono-label">{error.toUpperCase()}</span>
			</div>
		</div>
	{/if}

	<div class="auth-panel">
		<form
			class="login-form"
			onsubmit={(e) => {
				e.preventDefault();
				handleLogin();
			}}
		>
			<div class="login-field">
				<span class="mono-label">USER_IDENTIFIER</span>
				<div class="technical-input-group">
					<input
						type="email"
						bind:value={email}
						placeholder="admin@example.com"
						disabled={loading}
						autocomplete="username"
						required
					/>
				</div>
			</div>

			<div class="login-field">
				<span class="mono-label">SECURITY_TOKEN</span>
				<div class="technical-input-group">
					<input
						type="password"
						bind:value={password}
						placeholder="••••••••"
						disabled={loading}
						autocomplete="current-password"
						required
					/>
				</div>
			</div>

			<button class="button-primary login-submit" type="submit" disabled={loading}>
				{#if loading}
					<i class="fa-solid fa-spinner fa-spin me-2"></i>
					Signing in…
				{:else}
					Sign in
				{/if}
			</button>
		</form>
	</div>

	<footer class="login-footer">
		<p class="mono-label opacity-30">
			© 2026 RESEARCH OPERATIONS · ALL ACCESS LOGGED
		</p>
	</footer>
</div>
