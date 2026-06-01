<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import Toast from "$lib/components/Toast.svelte";
	import { fade } from "svelte/transition";

	type LayoutData = {
		session?: {
			access_token: string;
			refresh_token: string;
		};
	};

	let { data, children } = $props<{ data: LayoutData }>();
	let isMobileMenuOpen = $state(false);
	let _toggleTheme: (() => void) | null = null;

	// ตรวจสอบ session ทันทีเมื่อโหลดหน้า
	$effect(() => {
		if (!data.session) {
			goto("/login");
		}
	});

	function toggleTheme() {
		if (_toggleTheme) _toggleTheme();
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	$effect(() => {
		const path = $page.url.pathname;
		isMobileMenuOpen = false;
	});

	onMount(() => {
		// Sync session
		if (data.session) {
			supabase.auth
				.setSession({
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token,
				})
				.then(() => {
					console.log("✅ Session synced in layout");
				})
				.catch((e) => {
					console.warn("Session sync failed:", e);
				});
		}

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
				if (localStorage.getItem(storageKey) === "system")
					applyTheme("system");
			});

		applyTheme(theme);

		_toggleTheme = () => {
			const current = localStorage.getItem(storageKey) || "system";
			let next =
				current === "light"
					? "dark"
					: current === "dark"
						? "light"
						: "system";
			localStorage.setItem(storageKey, next);
			applyTheme(next);
		};

		// Auth listener
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			console.log("🔄 Auth event:", event);
			if (event === "SIGNED_OUT") {
				goto("/login");
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

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
			<span class="logo-text"
				>Niya's <span>ADMIN<small>beta</small></span></span
			>
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
					href="/downloader"
					class:active={$page.url.pathname === "/downloader"}
					>Downloader</a
				>
			</li>
			<li>
				<a
					href="/settings"
					class:active={$page.url.pathname === "/settings"}
					>Settings</a
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
		<button
			class="button-primary"
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
						href="/downloader"
						class:active={$page.url.pathname === "/downloader"}
						>Downloader</a
					>
				</li>
				<li>
					<a
						href="/settings"
						class:active={$page.url.pathname === "/settings"}
						>Settings</a
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
	<main class="main-content">
		{@render children()}
	</main>
</div>

<Toast />
