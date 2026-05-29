<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";

	let email = $state("");
	let password = $state("");
	let error = $state("");
	let loading = $state(false);

	async function handleLogin() {
		loading = true;
		error = "";

		try {
			const { data, error: err } = await supabase.auth.signInWithPassword(
				{
					email: email.trim(),
					password: password.trim(),
				},
			);

			if (err) {
				error = err.message;
				return;
			}

			if (data.session) {
				console.log("✅ Login successful");

				// วิธีแก้ค้าง — ใช้ window.location แรง ๆ แทน goto
				try {
					// Sync cookies ก่อน (ถ้ามี API นี้)
					const res = await fetch("/api/auth/session", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							access_token: data.session.access_token,
							refresh_token: data.session.refresh_token,
						}),
					});

					if (!res.ok) {
						console.warn("Failed to sync session cookie");
					}
				} catch (e) {
					console.warn("Cookie sync failed (normal in Tauri):", e);
				}

				// Redirect แบบแรง ๆ
				console.log("🔄 Redirecting to dashboard...");
				window.location.href = "/dashboard";
				// หรือใช้ goto แบบนี้ถ้าต้องการ
				// await goto("/dashboard", { replaceState: true, invalidateAll: true });
			}
		} catch (e: any) {
			console.error(e);
			error = e.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
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

			<button
				class="button-primary login-submit"
				type="submit"
				disabled={loading}
			>
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
