<script lang="ts">
  import { onMount } from "svelte";

  let stats = $state({
    apiStatus: "checking" as "online" | "offline" | "checking",
    endpoints: [] as string[],
  });

  let loadingStats = $state(true);

  onMount(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        stats.apiStatus = data.status === "online" ? "online" : "offline";
        stats.endpoints = data.endpoints || [];
      }
    } catch {
      stats.apiStatus = "offline";
    } finally {
      loadingStats = false;
    }
  });

  const quickActions = [
    {
      href: "/downloader",
      icon: "ti ti-download",
      label: "VOD Downloader",
      desc: "Search and download member lives & posts",
      accent: "blue" as const,
    },
    {
      href: "/theater",
      icon: "ti ti-movie",
      label: "Theater Archive",
      desc: "Browse playback and performance archives",
      accent: "orange" as const,
    },
    {
      href: "/scanner",
      icon: "ti ti-panorama-horizontal",
      label: "Asset Scanner",
      desc: "Discover CDN assets and products",
      accent: "green" as const,
    },
    {
      href: "/downloader",
      icon: "ti ti-list-check",
      label: "Download Manager",
      desc: "Monitor active and completed downloads",
      accent: "blue" as const,
    },
    {
      href: "/members",
      icon: "ti ti-users",
      label: "Members Manager",
      desc: "Manage members BNK48 & CGM48",
      accent: "orange" as const,
    },
    {
      href: "/events",
      icon: "ti ti-calendar-plus",
      label: "Events Manager",
      desc: "Manage BNK48 events & schedules",
      accent: "green" as const,
    },
  ];
</script>

<svelte:head>
  <title>Dashboard — Admin Panel</title>
</svelte:head>

<div class="dashboard">
  <header class="page-head">
    <h1>Dashboard</h1>
    <p>Manage content, downloads, and media assets across the platform.</p>
  </header>

  <section class="stats-section">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap">
          <i class="ti ti-activity" style="color: var(--blue);"></i>
        </div>
        <p class="stat-label">API Status</p>
        {#if loadingStats}
          <div class="skeleton-text"></div>
        {:else}
          <p class="stat-value" style="color: var(--blue);">
            {stats.apiStatus === "online" ? "Online" : stats.apiStatus === "checking" ? "…" : "Offline"}
          </p>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap">
          <i class="ti ti-plug" style="color: var(--orange);"></i>
        </div>
        <p class="stat-label">Endpoints Active</p>
        {#if loadingStats}
          <div class="skeleton-text"></div>
        {:else}
          <p class="stat-value" style="color: var(--orange);">{stats.endpoints.length}</p>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap">
          <i class="ti ti-cpu" style="color: var(--green);"></i>
        </div>
        <p class="stat-label">Platform</p>
        <p class="stat-value" style="color: var(--green);">SvelteKit v5</p>
      </div>
    </div>
  </section>

  <section class="actions-section">
    <div class="actions-grid">
      {#each quickActions as action}
        <a href={action.href} class="action-card">
          <i class={action.icon} style="color: var(--{action.accent});"></i>
          <div class="action-content">
            <h3 class="action-title">{action.label}</h3>
            <p class="action-desc">{action.desc}</p>
          </div>
        </a>
      {/each}
    </div>
  </section>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .page-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .page-head h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }

  .page-head p {
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    color: var(--muted);
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .stat-card {
    background: var(--card);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-icon-wrap i {
    font-size: 24px;
  }

  .stat-label {
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    color: var(--muted);
    font-weight: 500;
    margin: 0;
  }

  .stat-value {
    font-family: 'Outfit', sans-serif;
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    line-height: 1;
  }

  .skeleton-text {
    width: 60%;
    height: 24px;
    background: var(--border);
    border-radius: 4px;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.3; }
    100% { opacity: 0.6; }
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .action-card {
    background: var(--card);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    text-decoration: none;
    transition: transform 0.15s ease;
  }

  .action-card:hover {
    transform: translateY(-2px);
  }

  .action-card i {
    font-size: 24px;
    margin-top: 2px;
  }

  .action-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .action-title {
    font-family: 'Outfit', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }

  .action-desc {
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    color: var(--muted);
    margin: 0;
  }
</style>
