<script lang="ts">
  import "../../app.css";

  let { children } = $props();

  let sidebarOpen = $state(true);
  let mobileMenuOpen = $state(false);

  const navItems = [
    { href: "/", icon: "fa-solid fa-house", label: "Dashboard" },
    { href: "/downloader", icon: "fa-solid fa-download", label: "Downloader" },
    { href: "/theater", icon: "fa-solid fa-film", label: "Theater Archive" },
    { href: "/scanner", icon: "fa-solid fa-panorama", label: "Asset Scanner" },
    { href: "/campaigns", icon: "fa-solid fa-flag", label: "Campaigns" },
    { href: "/members", icon: "fa-solid fa-users", label: "Members" },
    { href: "/events", icon: "fa-solid fa-calendar-plus", label: "Events" },
    { href: "/auctions", icon: "fa-solid fa-gavel", label: "Auctions" },
  ];

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  // Determine active path
  let currentPath = $state("/");

  $effect(() => {
    if (typeof window !== "undefined") {
      currentPath = window.location.pathname;
    }
  });

  function isActive(href: string): boolean {
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
  }
</script>

<svelte:head>
  <title>Admin Panel</title>
</svelte:head>

<div class="app-shell" class:sidebar-collapsed={!sidebarOpen}>
  <!-- Mobile overlay -->
  {#if mobileMenuOpen}
    <div
      class="mobile-overlay"
      onclick={closeMobileMenu}
      role="presentation"
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:mobile-open={mobileMenuOpen}>
    <div class="sidebar-header">
      <div class="sidebar-brand">
        {#if sidebarOpen}
          <span class="brand-text">admin panel</span>
        {:else}
          <span class="brand-mark">a</span>
        {/if}
      </div>
      <button
        class="btn-icon hide-mobile"
        onclick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <i
          class="fa-solid"
          class:fa-chevron-left={sidebarOpen}
          class:fa-chevron-right={!sidebarOpen}
        ></i>
      </button>
    </div>

    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-item"
          class:active={isActive(item.href)}
          onclick={closeMobileMenu}
        >
          <i class={item.icon}></i>
          {#if sidebarOpen || mobileMenuOpen}
            <span>{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      {#if sidebarOpen}
        <div class="sidebar-status">
          <div class="status-dot online"></div>
          <span class="text-micro">System Online</span>
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main -->
  <div class="main-wrapper">
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <button
          class="btn-icon show-mobile-only"
          onclick={toggleMobileMenu}
          aria-label="Open menu"
        >
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>
      <div class="topbar-right">
        <span class="text-micro">BNK48 Content Manager</span>
      </div>
    </header>

    <!-- Page content -->
    <main class="main-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    min-height: 100vh;
    position: relative;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--color-footer);
    color: var(--color-on-primary);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transition: width var(--duration-slow) var(--ease-out);
    overflow: hidden;
  }

  .sidebar-collapsed .sidebar {
    width: var(--sidebar-collapsed);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    min-height: var(--topbar-height);
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .brand-text {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: lowercase;
    white-space: nowrap;
    color: var(--color-on-primary);
    opacity: 1;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  .brand-mark {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    text-transform: lowercase;
    color: var(--color-on-primary);
  }

  .sidebar-collapsed .brand-text {
    opacity: 0;
  }

  .sidebar-header .btn-icon {
    color: var(--color-stone);
    flex-shrink: 0;
  }

  .sidebar-header .btn-icon:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-on-primary);
  }

  /* ── Nav Items ─────────────────────────────────────────────────────── */
  .sidebar-nav {
    flex: 1;
    padding: var(--space-xs) var(--space-sm);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-xs);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.43;
    color: var(--color-stone);
    transition: color var(--duration-fast) var(--ease-out),
                background var(--duration-fast) var(--ease-out);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
  }

  .nav-item i {
    width: 20px;
    text-align: center;
    font-size: 14px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .nav-item:hover {
    color: var(--color-on-primary);
  }

  .nav-item.active {
    color: var(--color-on-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .sidebar-collapsed .nav-item {
    justify-content: center;
    padding: var(--space-sm);
  }

  .sidebar-collapsed .nav-item span {
    display: none;
  }

  /* ── Sidebar Footer ────────────────────────────────────────────────── */
  .sidebar-footer {
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .sidebar-status {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-stone);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.online {
    background: var(--color-on-primary);
  }

  /* ── Mobile Overlay ────────────────────────────────────────────────── */
  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(3, 3, 3, 0.6);
    z-index: 99;
  }

  /* ── Main Wrapper ──────────────────────────────────────────────────── */
  .main-wrapper {
    flex: 1;
    margin-left: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    transition: margin-left var(--duration-slow) var(--ease-out);
  }

  .sidebar-collapsed .main-wrapper {
    margin-left: var(--sidebar-collapsed);
  }

  /* ── Top Bar ───────────────────────────────────────────────────────── */
  .topbar {
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-lg);
    background: var(--color-canvas);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .topbar-right .text-micro {
    color: var(--color-slate);
    letter-spacing: 0.35px;
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 450;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  /* ── Main Content ──────────────────────────────────────────────────── */
  .main-content {
    flex: 1;
    padding: var(--space-xl) var(--space-xxl);
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    animation: fade-in var(--duration-normal) var(--ease-out);
  }

  /* ── Responsive ────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .sidebar {
      transform: translateX(-100%);
      width: 280px;
    }

    .sidebar.mobile-open {
      transform: translateX(0);
    }

    .mobile-overlay {
      display: block;
    }

    .main-wrapper {
      margin-left: 0 !important;
    }

    .main-content {
      padding: 20px 16px;
    }

    .topbar {
      padding: 0 16px;
    }
  }

  @media (max-width: 1024px) {
    .main-content {
      padding: 24px;
    }
  }
</style>
