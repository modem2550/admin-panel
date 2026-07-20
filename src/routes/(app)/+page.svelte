<script lang="ts">
  import { onMount } from "svelte";

  let stats = $state({
    apiStatus: "checking" as "online" | "offline" | "checking",
    endpoints: [] as string[],
  });

  let recentJobs = $state<any[]>([]);
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
      icon: "fa-solid fa-download",
      label: "VOD Downloader",
      desc: "Search and download member lives & posts",
    },
    {
      href: "/theater",
      icon: "fa-solid fa-film",
      label: "Theater Archive",
      desc: "Browse playback and performance archives",
    },
    {
      href: "/scanner",
      icon: "fa-solid fa-panorama",
      label: "Asset Scanner",
      desc: "Discover CDN assets and products",
    },
    {
      href: "/downloader",
      icon: "fa-solid fa-list-check",
      label: "Download Manager",
      desc: "Monitor active and completed downloads",
    },
    {
      href: "/members",
      icon: "fa-solid fa-users",
      label: "Members Manager",
      desc: "Manage members BNK48 & CGM48",
    },
    {
      href: "/events",
      icon: "fa-solid fa-calendar-plus",
      label: "Events Manager",
      desc: "Manage BNK48 events & schedules",
    }
  ];
</script>

<svelte:head>
  <title>Dashboard — Admin Panel</title>
</svelte:head>

<div class="dashboard fade-in">
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="hero-content">
      <p class="text-mono-label hero-label">Content Management System</p>
      <h1 class="hero-title">Admin Panel</h1>
      <p class="hero-subtitle">
        Manage BNK48 content, downloads, and media assets from a single
        interface.
      </p>
    </div>
  </section>

  <!-- Stats Grid -->
  <section class="stats-section">
    <div class="stats-grid">
      <!-- API Status -->
      <div class="stat-card card card-stone">
        <div class="stat-icon">
          <i class="fa-solid fa-signal"></i>
        </div>
        <div class="stat-info">
          <p class="text-mono-label">API Status</p>
          {#if loadingStats}
            <div
              class="skeleton"
              style="width: 80px; height: 28px; margin-top: 4px;"
            ></div>
          {:else}
            <p
              class="stat-value"
              class:online={stats.apiStatus === "online"}
              class:offline={stats.apiStatus === "offline"}
            >
              {stats.apiStatus === "online" ? "Online" : "Offline"}
            </p>
          {/if}
        </div>
        <div class="stat-badge">
          <span
            class="chip"
            class:chip-completed={stats.apiStatus === "online"}
            class:chip-failed={stats.apiStatus === "offline"}
            class:chip-queued={stats.apiStatus === "checking"}
          >
            <span class="chip-dot" class:pulse={stats.apiStatus === "checking"}
            ></span>
            {stats.apiStatus}
          </span>
        </div>
      </div>

      <!-- Endpoints -->
      <div class="stat-card card card-stone">
        <div class="stat-icon">
          <i class="fa-solid fa-plug"></i>
        </div>
        <div class="stat-info">
          <p class="text-mono-label">Endpoints</p>
          {#if loadingStats}
            <div
              class="skeleton"
              style="width: 50px; height: 28px; margin-top: 4px;"
            ></div>
          {:else}
            <p class="stat-value">{stats.endpoints.length}</p>
          {/if}
        </div>
        <div class="stat-badge">
          <span class="chip chip-queued">routes</span>
        </div>
      </div>

      <!-- Platform -->
      <div class="stat-card card card-stone">
        <div class="stat-icon">
          <i class="fa-solid fa-cube"></i>
        </div>
        <div class="stat-info">
          <p class="text-mono-label">Platform</p>
          <p class="stat-value">SvelteKit</p>
        </div>
        <div class="stat-badge">
          <span class="chip chip-processing">v5</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Quick Actions -->
  <section class="actions-section">
    <h2 class="text-feature-heading section-title">Quick Actions</h2>
    <div class="actions-grid">
      {#each quickActions as action}
        <a href={action.href} class="action-card card">
          <div class="action-icon-wrap">
            <i class={action.icon}></i>
          </div>
          <div class="action-content">
            <h3 class="action-title">{action.label}</h3>
            <p class="action-desc">{action.desc}</p>
          </div>
          <div class="action-arrow">
            <i class="fa-solid fa-arrow-right"></i>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- API Endpoints -->
  {#if stats.endpoints.length > 0}
    <section class="endpoints-section">
      <h2 class="text-feature-heading section-title">Available Endpoints</h2>
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each stats.endpoints as endpoint}
              <tr>
                <td>
                  <span class="chip chip-processing">GET/POST</span>
                </td>
                <td>
                  <code class="endpoint-path">{endpoint}</code>
                </td>
                <td>
                  <span class="chip chip-completed">
                    <span class="chip-dot"></span>
                    Active
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-section);
  }

  .hero-section {
    padding: var(--space-lg) 0 0;
  }

  .hero-label {
    margin-bottom: var(--space-sm);
  }

  .hero-title {
    font-family: var(--font-body);
    font-size: clamp(36px, 5vw, 48px);
    font-weight: 400;
    line-height: 1;
    letter-spacing: -1.2px;
    color: var(--color-ink);
    margin-bottom: var(--space-md);
  }

  .hero-subtitle {
    font-size: 20px;
    line-height: 1;
    color: var(--color-graphite);
    max-width: 520px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-md);
  }

  .stat-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-lg);
    position: relative;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    background: var(--color-hairline);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-ink);
    font-size: 18px;
    flex-shrink: 0;
  }

  .stat-info {
    flex: 1;
    min-width: 0;
  }

  .stat-info .text-mono-label {
    margin-bottom: var(--space-xxs);
  }

  .stat-value {
    font-family: var(--font-body);
    font-size: 28px;
    font-weight: 400;
    letter-spacing: -0.5px;
    line-height: 1;
    color: var(--color-ink);
  }

  .stat-value.online,
  .stat-value.offline {
    color: var(--color-ink);
  }

  .stat-badge {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
  }

  .section-title {
    margin-bottom: var(--space-lg);
    color: var(--color-ink);
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-sm);
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-lg);
    text-decoration: none;
    cursor: pointer;
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-none);
    transition: border-color var(--duration-normal) var(--ease-out),
                background var(--duration-normal) var(--ease-out);
  }

  .action-card:hover {
    border-color: var(--color-hairline-soft);
    background: var(--color-hairline);
  }

  .action-card:hover .action-arrow {
    color: var(--color-ink);
  }

  .action-icon-wrap {
    width: 40px;
    height: 40px;
    background: var(--color-primary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-on-primary);
    font-size: 16px;
    flex-shrink: 0;
  }

  .action-content {
    flex: 1;
    min-width: 0;
  }

  .action-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink);
    margin-bottom: 2px;
  }

  .action-desc {
    font-size: 13px;
    color: var(--color-stone);
    line-height: 1.3;
  }

  .action-arrow {
    color: var(--color-stone);
    font-size: 14px;
    transition: color var(--duration-normal) var(--ease-out);
    flex-shrink: 0;
  }

  .endpoint-path {
    font-size: 13px;
    color: var(--color-ink);
    background: var(--color-hairline);
    padding: 4px 8px;
    border-radius: var(--radius-xs);
  }

  @media (max-width: 768px) {
    .stats-grid,
    .actions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
