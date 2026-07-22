<script lang="ts">
  import "../../app.css";

  let { children } = $props();

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/downloader", label: "Downloader" },
    { href: "/theater", label: "Theater Archive" },
    { href: "/scanner", label: "Asset Scanner" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/members", label: "Members" },
    { href: "/events", label: "Events" },
    { href: "/auctions", label: "Auctions" },
  ];

  let currentPath = $state("/");
  let mobileMenuOpen = $state(false);

  $effect(() => {
    if (typeof window !== "undefined") {
      currentPath = window.location.pathname;
    }
  });

  function isActive(href: string): boolean {
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function onMobileMenuKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closeMobileMenu();
  }
</script>

<svelte:head>
  <title>Admin Panel</title>
</svelte:head>

<svelte:window onkeydown={onMobileMenuKeydown} />

<div class="app-shell">
  <header class="app-header">
    <div class="header-left">
      <div class="brand">
        <img src="/app-logo.png" alt="Logo" class="logo" />
        <span class="wordmark">Admin panel</span>
      </div>
      <nav class="nav-links">
        {#each navItems as item}
          <a
            href={item.href}
            class="nav-link"
            class:active={isActive(item.href)}
          >
            {item.label}
          </a>
        {/each}
      </nav>
    </div>

    <button
      class="burger-btn"
      onclick={toggleMobileMenu}
      aria-label="Open menu"
      aria-expanded={mobileMenuOpen}
    >
      <i class="ti ti-menu-2"></i>
    </button>
  </header>

  <!-- Mobile slide-in nav -->
  {#if mobileMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="mobile-nav-backdrop" onclick={closeMobileMenu}></div>
    <nav class="mobile-nav-drawer" aria-label="Mobile navigation">
      <div class="mobile-nav-header">
        <div class="brand">
          <img src="/app-logo.png" alt="Logo" class="logo" />
          <span class="wordmark">Admin panel</span>
        </div>
        <button class="mobile-nav-close" onclick={closeMobileMenu} aria-label="Close menu">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="mobile-nav-links">
        {#each navItems as item}
          <a
            href={item.href}
            class="mobile-nav-link"
            class:active={isActive(item.href)}
            onclick={closeMobileMenu}
          >
            {item.label}
          </a>
        {/each}
      </div>
    </nav>
  {/if}

  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--white);
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 32px;
    background: var(--white);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
    border-radius: 4px;
  }

  .wordmark {
    font-family: "Outfit", sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .nav-links::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    font-family: "Outfit", sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    padding: 6px 12px;
    border-radius: 999px;
    transition:
      background 0.15s ease,
      color 0.15s ease;
    text-decoration: none;
  }

  .nav-link:hover {
    color: var(--ink);
  }

  .nav-link.active {
    background: var(--card);
    color: var(--ink);
  }

  /* ── Burger button (mobile only) ───────────────────────────────────── */
  .burger-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--white);
    color: var(--ink);
    font-size: 18px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .burger-btn:hover {
    background: var(--card);
  }

  /* ── Mobile slide-in drawer ────────────────────────────────────────── */
  .mobile-nav-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    animation: mobileBackdropIn 0.15s ease;
  }

  @keyframes mobileBackdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .mobile-nav-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 201;
    width: min(78vw, 300px);
    background: var(--white);
    border-left: 1px solid var(--border);
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    animation: mobileDrawerIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes mobileDrawerIn {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  .mobile-nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .mobile-nav-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--ink);
    font-size: 18px;
    cursor: pointer;
    border-radius: 8px;
  }

  .mobile-nav-close:hover {
    background: var(--card);
  }

  .mobile-nav-links {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    overflow-y: auto;
  }

  .mobile-nav-link {
    font-family: "Outfit", sans-serif;
    font-size: 15px;
    font-weight: 500;
    color: var(--muted);
    padding: 12px 14px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .mobile-nav-link:hover {
    background: var(--card);
    color: var(--ink);
  }

  .mobile-nav-link.active {
    background: var(--card);
    color: var(--ink);
    font-weight: 600;
  }

  /* ── Main Content ──────────────────────────────────────────────────── */
  .main-content {
    flex: 1;
    padding: 32px 48px;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

  /* ── Responsive: switch to burger menu on narrow screens ────────────── */
  @media (max-width: 1000px) {
    .app-header {
      padding: 0 16px;
    }

    .header-left {
      gap: 12px;
    }

    .nav-links {
      display: none;
    }

    .burger-btn {
      display: flex;
    }

    .main-content {
      padding: 20px 16px;
    }
  }
</style>
