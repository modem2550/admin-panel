<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import Toast from "$lib/components/Toast.svelte";
	import { fade } from "svelte/transition";

	let { children } = $props();
	let isMobileMenuOpen = $state(false);
	let _toggleTheme: (() => void) | null = null;

	function toggleTheme() {
		if (_toggleTheme) _toggleTheme();
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	// Close menu on navigation
	$effect(() => {
		const path = $page.url.pathname;
		isMobileMenuOpen = false;
	});

	onMount(() => {
		// Auth: ใช้ +layout.server.ts (cookie → locals.session) — ห้ามพึ่ง getSession()
		// เพราะ persistSession: false ทำให้ client มักได้ null แล้วโดนไล่ไป /login โดยผิด (มักเจอบนจอเล็ก)

		// Theme Management
		const storageKey = "cohere-theme-preference";
		let theme = localStorage.getItem(storageKey) || "system";

		const applyTheme = (currentTheme: string) => {
			const isDark =
				currentTheme === "dark" ||
				(currentTheme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);

			if (isDark) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		};

		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", () => {
				if (localStorage.getItem(storageKey) === "system") {
					applyTheme("system");
				}
			});

		applyTheme(theme);

		// Expose toggle function
		_toggleTheme = () => {
			const current = localStorage.getItem(storageKey) || "system";
			let next = "light";
			if (current === "light") next = "dark";
			else if (current === "dark") next = "light";

			localStorage.setItem(storageKey, next);
			applyTheme(next);
		};

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			// เฉพาะ sign out จริง — อย่า redirect เมื่อ session=null จาก INITIAL_SESSION ฯลฯ
			if (event === "SIGNED_OUT") {
				goto("/login");
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<div class="announcement-bar">
	<div class="announcement-content">
		<span>New feature: BNK48 Media Explorer is now live.</span>
		<a href="/playback"
			>Explore now <i class="fa-solid fa-arrow-right"></i></a
		>
	</div>
</div>

<header class="global-nav">
	<div class="nav-left">
		<button
			class="mobile-menu-trigger"
			onclick={toggleMobileMenu}
			aria-label="Toggle Menu"
		>
			<i
				class="fa-solid {isMobileMenuOpen
					? 'fa-xmark'
					: 'fa-bars-staggered'}"
			></i>
		</button>
		<a href="/dashboard" class="logo">
			<i class="fa-solid fa-cube"></i>
			<span class="logo-text">COHERE<span>ADMIN</span></span>
		</a>
	</div>

	<nav class="nav-center">
		<ul class="nav-links">
			<li>
				<a
					href="/dashboard"
					class:active={$page.url.pathname === "/dashboard"}
					>Dashboard</a
				>
			</li>
			<li>
				<a
					href="/assets"
					class:active={$page.url.pathname === "/assets"}>Assets</a
				>
			</li>
			<li>
				<a
					href="/events"
					class:active={$page.url.pathname === "/events"}>Events</a
				>
			</li>
			<li>
				<a
					href="/members"
					class:active={$page.url.pathname === "/members"}>Members</a
				>
			</li>
			<li>
				<a
					href="/playback"
					class:active={$page.url.pathname === "/playback"}
					>Playback</a
				>
			</li>
		</ul>
	</nav>

	<div class="nav-right">
		<button
			class="icon-btn theme-toggle"
			onclick={toggleTheme}
			aria-label="Toggle Theme"
		>
			<i class="fa-solid fa-circle-half-stroke"></i>
		</button>
		<a href="/settings" class="icon-btn" aria-label="Settings">
			<i class="fa-solid fa-gear"></i>
		</a>
		<button
			class="button-primary hide-mobile"
			onclick={async () => {
				await supabase.auth.signOut();
				goto("/login");
			}}
		>
			Sign Out
		</button>
	</div>
</header>

{#if isMobileMenuOpen}
	<div
		class="mobile-nav-overlay"
		onclick={toggleMobileMenu}
		onkeydown={(e) => e.key === "Escape" && toggleMobileMenu()}
		role="button"
		tabindex="0"
		transition:fade={{ duration: 200 }}
	>
		<nav
			class="mobile-nav-content"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<ul class="mobile-links">
				<li>
					<a
						href="/dashboard"
						class:active={$page.url.pathname === "/dashboard"}
						>Dashboard</a
					>
				</li>
				<li>
					<a
						href="/assets"
						class:active={$page.url.pathname === "/assets"}
						>Assets</a
					>
				</li>
				<li>
					<a
						href="/events"
						class:active={$page.url.pathname === "/events"}
						>Events</a
					>
				</li>
				<li>
					<a
						href="/members"
						class:active={$page.url.pathname === "/members"}
						>Members</a
					>
				</li>
				<li>
					<a
						href="/playback"
						class:active={$page.url.pathname === "/playback"}
						>Playback</a
					>
				</li>
			</ul>
			<div class="mobile-footer">
				<button
					class="button-primary w-full"
					onclick={async () => {
						await supabase.auth.signOut();
						goto("/login");
					}}
				>
					Sign Out
				</button>
			</div>
		</nav>
	</div>
{/if}

<div class="app-layout">
	<main class="main-content container">
		{@render children()}
	</main>
</div>

<Toast />

<style>
	:global(:root) {
		/* Colors */
		--co-black: #000000;
		--co-near-black: #17171c;
		--co-white: #ffffff;
		--co-canvas: #ffffff;
		--co-stone: #eeece7;
		--co-green: #003c33;
		--co-navy: #071829;
		--co-blue: #1863dc;
		--co-coral: #ff7759;
		--co-hairline: #d9d9dd;
		--co-border-light: #e5e7eb;
		--co-ink: #212121;
		--co-slate-muted: #93939f;

		/* Fonts */
		--font-display: "Space Grotesk", sans-serif;
		--font-body: "Inter", sans-serif;
		--font-mono: "JetBrains Mono", monospace;

		/* Spacing & Radii */
		--radius-xs: 4px;
		--radius-sm: 8px;
		--radius-md: 16px;
		--radius-lg: 22px;
		--radius-pill: 32px;

		/* Layout */
		--nav-height: 72px;
		--announcement-height: 36px;
	}

	:global(.dark) {
		--co-canvas: #000000;
		--co-white: #17171c;
		--co-ink: #f5f5f7;
		--co-hairline: #2d2d2d;
		--co-border-light: #3a3a3a;
		--co-stone: #1a1a1a;
	}

	:global(body) {
		margin: 0;
		font-family: var(--font-body);
		background-color: var(--co-canvas);
		color: var(--co-ink);
		-webkit-font-smoothing: antialiased;
		line-height: 1.5;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		font-family: var(--font-display);
		font-weight: 500;
		letter-spacing: -0.02em;
	}

	/* Announcement Bar */
	.announcement-bar {
		height: var(--announcement-height);
		background-color: var(--co-black);
		color: var(--co-white);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-family: var(--font-body);
		z-index: 1001;
		position: relative;
	}

	.announcement-content {
		display: flex;
		gap: 12px;
	}

	.announcement-content a {
		color: var(--co-white);
		text-decoration: underline;
		font-weight: 500;
	}

	/* Global Nav */
	.global-nav {
		height: var(--nav-height);
		background-color: var(--co-canvas);
		border-bottom: 1px solid var(--co-hairline);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 40px;
		position: sticky;
		top: 0;
		z-index: 1000;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.nav-left .logo {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		color: var(--co-black);
	}

	:global(.dark) .nav-left .logo {
		color: var(--bs-gray-200) !important;
	}

	.logo i {
		font-size: 24px;
	}
	.logo-text {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 18px;
		letter-spacing: 0.1em;
	}
	.logo-text span {
		font-weight: 300;
		opacity: 0.6;
	}

	.nav-center .nav-links {
		display: flex;
		list-style: none;
		padding: 0;
		margin: 0;
		gap: 32px;
	}

	.nav-links a {
		text-decoration: none;
		color: var(--co-ink);
		font-size: 14px;
		font-weight: 500;
		transition: opacity 0.2s;
		opacity: 0.7;
	}

	.nav-links a:hover,
	.nav-links a.active {
		opacity: 1;
	}

	.nav-links a.active {
		position: relative;
	}

	.nav-links a.active::after {
		content: "";
		position: absolute;
		bottom: -25px;
		left: 0;
		right: 0;
		height: 2px;
		background-color: var(--co-black);
	}

	:global(.dark) .nav-links a.active::after {
		background-color: var(--co-white);
	}

	:global(.dark) .announcement-bar {
		background-color: var(--bs-gray-100) !important;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--co-ink);
		font-size: 18px;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.2s;
		text-decoration: none;
	}

	.icon-btn:hover {
		opacity: 1;
	}

	.button-primary {
		background-color: var(--co-near-black);
		color: var(--co-white);
		border: none;
		padding: 10px 20px;
		border-radius: var(--radius-pill);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: transform 0.2s;
	}

	:global(.dark) .button-primary {
		background-color: var(--co-white);
		color: var(--co-near-black);
	}

	.button-primary:hover {
		transform: translateY(-1px);
	}

	/* Layout Structure */
	.app-layout {
		display: flex;
		min-height: calc(
			100vh - var(--nav-height) - var(--announcement-height)
		);
	}

	.main-content {
		flex: 1;
		width: 100%;
		margin: 0 auto;
		padding: clamp(2rem, 4vw, 3.25rem) 0;
	}

	/* Mobile Nav Styles */
	.mobile-menu-trigger {
		display: none;
		background: none;
		border: none;
		color: var(--co-ink);
		font-size: 20px;
		cursor: pointer;
		padding: 8px;
		margin-left: -8px;
	}

	.mobile-nav-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		z-index: 2000;
		display: flex;
		justify-content: flex-start;
	}

	.mobile-nav-content {
		width: 280px;
		height: 100%;
		background: var(--co-canvas);
		display: flex;
		flex-direction: column;
		padding: 40px 24px;
		box-shadow: 20px 0 60px rgba(0, 0, 0, 0.1);
	}

	.mobile-links {
		list-style: none;
		padding: 0;
		margin: 40px 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mobile-links a {
		text-decoration: none;
		color: var(--co-ink);
		font-size: 18px;
		font-weight: 500;
		padding: 12px 16px;
		border-radius: var(--radius-sm);
		display: block;
		transition: background 0.2s;
	}

	.mobile-links a:hover,
	.mobile-links a.active {
		background: var(--co-stone);
	}

	.mobile-footer {
		margin-top: auto;
	}

	.w-full {
		width: 100%;
	}

	@media (max-width: 1024px) {
		.nav-center {
			display: none;
		}
		.global-nav {
			padding: 0 20px;
		}
		.mobile-menu-trigger {
			display: block;
		}
		.hide-mobile {
			display: none;
		}

		.main-content {
			padding: 40px 20px;
		}
	}

	@media (max-width: 640px) {
		.announcement-bar {
			font-size: 11px;
			padding: 0 16px;
			text-align: center;
		}
		.announcement-content span {
			display: none;
		}
		.announcement-content::before {
			content: "Media Explorer is Live";
		}
	}

	/* Reusable Cohere Classes */
	:global(.text-display) {
		font-family: var(--font-display);
	}
	:global(.mono-label) {
		font-family: var(--font-mono);
		text-transform: uppercase;
		font-size: 12px;
		letter-spacing: 0.05em;
		color: var(--co-slate-muted);
	}

	:global(.card-cohere) {
		background: var(--co-white);
		border: 1px solid var(--co-hairline);
		border-radius: var(--radius-md);
		padding: 24px;
		transition: border-color 0.2s;
	}

	:global(.card-cohere:hover) {
		border-color: var(--co-slate-muted);
	}

	:global(.rule-list) {
		list-style: none;
		padding: 0;
	}

	:global(.rule-item) {
		border-top: 1px solid var(--co-hairline);
		padding: 20px 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	:global(.button-secondary) {
		background: none;
		border: none;
		text-decoration: underline;
		color: var(--co-ink);
		font-weight: 500;
		cursor: pointer;
	}

	:global(.button-pill-outline) {
		background: none;
		border: 1px solid var(--co-hairline);
		color: var(--co-ink);
		padding: 10px 20px;
		border-radius: var(--radius-pill);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}

	:global(.button-pill-outline:hover),
	:global(.button-pill-outline.active) {
		border-color: var(--co-ink);
		background: var(--co-ink);
		color: var(--co-canvas);
	}

	:global(.flex-1) {
		flex: 1;
	}

	/* Modal shared styles */
	:global(.modal-overlay) {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	:global(.close-trigger) {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--co-slate-muted);
		font-size: 20px;
		transition: color 0.2s;
		padding: 4px;
	}

	:global(.close-trigger:hover) {
		color: var(--co-ink);
	}

	/* Page animation keyframes */
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(32px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Shared form styles used in modals */
	:global(.technical-title) {
		font-size: 20px;
		font-weight: 500;
		margin: 0;
	}

	:global(.card-heading) {
		font-family: var(--font-display);
		font-size: 32px;
		font-weight: 500;
		margin: 0;
	}

	:global(.body) {
		font-size: 15px;
		color: var(--co-slate-muted);
	}

	:global(.body-small) {
		font-size: 13px;
		color: var(--co-slate-muted);
	}

	/* Technical shared inputs */
	:global(.technical-input-group) {
		display: flex;
		align-items: center;
		background: var(--co-stone);
		border: 1px solid var(--co-hairline);
		border-radius: var(--radius-sm);
	}

	:global(.input-group-technical) {
		display: flex;
		align-items: center;
		background: var(--co-stone);
		border: 1px solid var(--co-hairline);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	:global(.input-group-technical input) {
		flex: 1;
		background: none;
		border: none;
		padding: 12px 16px;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--co-ink);
		outline: none;
	}

	:global(.input-group-technical button) {
		padding: 12px 16px;
		background: none;
		border: none;
		border-left: 1px solid var(--co-hairline);
		cursor: pointer;
		color: var(--co-slate-muted);
		transition: color 0.2s;
	}

	:global(.input-group-technical button:hover) {
		color: var(--co-blue);
	}

	/* Modal form card (shared between members/events/playback) */
	:global(.contact-form-card),
	:global(.record-form-card) {
		width: 100%;
		max-width: 640px;
		max-height: 90vh;
		overflow-y: auto;
		background: var(--co-canvas);
		border-radius: var(--radius-lg);
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.3);
		animation: slide-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	:global(.form-header) {
		padding: 32px 40px;
		border-bottom: 1px solid var(--co-hairline);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--co-stone);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	:global(.close-btn) {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--co-slate-muted);
		font-size: 20px;
		transition: color 0.2s;
	}

	:global(.close-btn:hover) {
		color: var(--co-ink);
	}

	/* Misc utility */
	:global(.opacity-50) {
		opacity: 0.5;
	}
	:global(.opacity-20) {
		opacity: 0.2;
	}
	:global(.opacity-30) {
		opacity: 0.3;
	}
	:global(.text-end) {
		text-align: right;
	}
	:global(.mb-3) {
		margin-bottom: 12px;
	}
	:global(.mb-4) {
		margin-bottom: 16px;
	}
	:global(.block) {
		display: block;
	}
	:global(.ms-1) {
		margin-left: 4px;
	}
	:global(.ms-2) {
		margin-left: 8px;
	}
	:global(.me-2) {
		margin-right: 8px;
	}
	:global(.me-3) {
		margin-right: 12px;
	}
	:global(.px-5) {
		padding-left: 20px;
		padding-right: 20px;
	}

	/* Image grids in modals */
	:global(.image-inventory) {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	:global(.inventory-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
	}

	:global(.inventory-item) {
		aspect-ratio: 1/1;
		border-radius: var(--radius-sm);
		overflow: hidden;
		position: relative;
		background: var(--co-stone);
	}

	:global(.inventory-item img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	:global(.item-overlay) {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		opacity: 0;
		transition: opacity 0.2s;
	}

	:global(.inventory-item:hover .item-overlay) {
		opacity: 1;
	}

	:global(.item-overlay button),
	:global(.item-overlay a) {
		background: rgba(255, 255, 255, 0.15);
		border: none;
		color: white;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		text-decoration: none;
		font-size: 13px;
	}

	/* Technical details used in playback modal */
	:global(.technical-details) {
		padding: 40px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	:global(.technical-links) {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	:global(.link-item) {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	:global(.modal-actions-co) {
		display: flex;
		gap: 12px;
	}
</style>
