<script lang="ts">
  import type { PageData } from "./$types";
  import type { MemberItem } from "./+page.server";
  import { enhance } from "$app/forms";

  let { data }: { data: PageData } = $props();

  let members = $derived(data.members as MemberItem[]);
  let loadError = $derived(data.error as string | null);

  // ── State ──────────────────────────────────────────────────────────────────
  let searchQuery = $state("");
  let filterBrand = $state("all");
  let filterStatus = $state<"active" | "graduated" | "all">("active");
  let editMember = $state<MemberItem | null>(null);
  let isCreating = $state(false);

  // ── Derived values ─────────────────────────────────────────────────────────
  let brands = $derived([
    "all",
    ...Array.from(
      new Set(members.map((m) => m.brand ?? "Unknown").filter(Boolean)),
    ).sort(),
  ]);

  let gens = $derived.by(() => {
    const set = new Set(members.map((m) => m.gen ?? "").filter(Boolean));
    return Array.from(set).sort();
  });

  let filtered = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.real_name ?? "").toLowerCase().includes(q) ||
        (m.team ?? "").toLowerCase().includes(q) ||
        (m.gen ?? "").toLowerCase().includes(q);

      const matchBrand =
        filterBrand === "all" || (m.brand ?? "Unknown") === filterBrand;

      const matchStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "graduated"
            ? !!m.graduated_at
            : !m.graduated_at;

      return matchQuery && matchBrand && matchStatus;
    });
  });

  // Group by brand for the brand count chips
  let brandCounts = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      const b = m.brand ?? "Unknown";
      counts[b] = (counts[b] ?? 0) + 1;
    }
    return counts;
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function getBrandColor(brand: string | null): string {
    switch (brand) {
      case "BNK48":
        return "var(--bnk48)";
      case "CGM48":
        return "var(--cgm48)";
      case "MNL48":
        return "var(--mnl48)";
      default:
        return "var(--color-slate)";
    }
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function openDetail(m: MemberItem) {
    isCreating = false;
    editMember = { ...m };
  }

  function openCreate() {
    isCreating = true;
    editMember = {
      id: 0,
      name: "",
      real_name: null,
      brand: null,
      gen: null,
      team: null,
      profile_image_url: null,
      graduated_at: null,
      created_at: new Date().toISOString(),
    };
  }

  function closeDetail() {
    editMember = null;
    isCreating = false;
  }
</script>

<svelte:head>
  <title>Members — Admin Panel</title>
</svelte:head>

<div class="members-page fade-in">
  <!-- Header -->
  <div
    class="page-header"
    style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px"
  >
    <div>
      <p class="text-mono-label page-label">Database</p>
      <h1 class="page-title">Members</h1>
      <p class="page-desc">
        Browse BNK48 / CGM48 group members from the Supabase database.
      </p>
    </div>
    <button
      class="btn btn-primary"
      style="margin-top: 12px;"
      onclick={openCreate}
    >
      <i class="ti ti-plus"></i> Add Member
    </button>
  </div>

  <!-- Summary chips -->
  {#if members.length > 0}
    <div class="brand-summary">
      {#each Object.entries(brandCounts) as [brand, count]}
        <button
          class="brand-chip"
          class:active={filterBrand === brand}
          onclick={() => (filterBrand = filterBrand === brand ? "all" : brand)}
          style="--brand-color: {getBrandColor(brand)}"
        >
          <span class="brand-chip-name">{brand}</span>
          <span class="brand-chip-count">{count}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Controls -->
  <div class="controls-bar">
    <div class="search-wrap">
      <i class="ti ti-magnifying-glass search-icon"></i>
      <input
        id="members-search"
        class="form-input search-input"
        type="search"
        placeholder="Search by name, team, gen…"
        bind:value={searchQuery}
      />
    </div>

    <div class="bar">
      <div class="filter-tabs">
        {#each [["active", "Active"], ["graduated", "Graduated"], ["all", "All"]] as [val, label]}
          <button
            class="btn btn-pill-outline btn-sm"
            class:active={filterStatus === val}
            onclick={() => (filterStatus = val as any)}
          >
            {label}
          </button>
        {/each}
      </div>

      <span
        class="text-caption"
        style="color: var(--color-muted); margin-left: auto; white-space: nowrap;"
      >
        {filtered.length} / {members.length} members
      </span>
    </div>
  </div>

  <!-- Error -->
  {#if loadError}
    <div class="error-banner">
      <i class="ti ti-alert-circle"></i>
      <span>{loadError}</span>
    </div>
  {/if}

  <!-- Empty States -->
  {#if members.length === 0 && !loadError}
    <div class="empty-state">
      <i class="ti ti-users"></i>
      <p>No members found in the database.</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      <i class="ti ti-user-slash"></i>
      <p>No members match your filters.</p>
    </div>
  {:else}
    <div class="members-grid">
      {#each filtered as member (member.id)}
        <button
          class="member-card"
          onclick={() => openDetail(member)}
          aria-label="View details for {member.name}"
          style="--brand-color: {getBrandColor(member.brand)}"
        >
          <!-- Photo block -->
          <div class="member-photo">
            {#if member.profile_image_url}
              <img
                src={member.profile_image_url}
                alt={member.name}
                class="member-avatar"
                loading="lazy"
              />
            {:else}
              <div class="member-avatar member-avatar-fallback">
                <span>{getInitials(member.name)}</span>
              </div>
            {/if}

            {#if member.graduated_at}
              <div class="graduated-badge">
                <i class="ti ti-graduation-cap"></i>
              </div>
            {/if}
          </div>

          <!-- Info block sits below the photo, not overlaid on it -->
          <div class="member-info">
            <h3 class="member-name">{member.name}</h3>
            {#if member.real_name}
              <p class="member-real-name">{member.real_name}</p>
            {/if}
            <div class="member-tags">
              {#if member.brand}
                <span class="member-tag"> {member.brand}</span>
              {/if}
              <span class="member-tag"> • </span>
              {#if member.gen}
                <span class="member-tag">{member.gen}</span>
              {/if}
              <span class="member-tag"> • </span>
              {#if member.team}
                <span class="member-tag">{member.team}</span>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- ── Detail Modal ─────────────────────────────────────────────────────── -->
{#if editMember}
  {@const m = editMember}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop fade-in" onclick={closeDetail} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="modal-content card fade-in-scale"
      onclick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div class="modal-header">
        <h2 class="text-feature-heading" style="margin: 0;">
          {isCreating ? "Add Member" : "Edit Member"}
        </h2>
        <button class="btn-icon" onclick={closeDetail} aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <form
        method="post"
        action={isCreating ? "?/createMember" : "?/updateMember"}
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === "success") {
              closeDetail();
              update();
            } else {
              update();
            }
          };
        }}
        class="modal-body"
      >
        {#if !isCreating}
          <input type="hidden" name="id" value={m.id} />
        {/if}

        <div
          class="modal-media"
          style="--brand-color: {getBrandColor(m.brand)}"
        >
          {#if m.profile_image_url}
            <img src={m.profile_image_url} alt={m.name} class="modal-avatar" />
          {:else}
            <div class="modal-avatar-fallback">
              <span>{getInitials(m.name)}</span>
            </div>
          {/if}
        </div>

        <div class="modal-info modal-form-grid">
          <div class="form-group">
            <label class="form-label" for="name">Name</label>
            <input
              id="name"
              class="form-input"
              type="text"
              name="name"
              required
              bind:value={m.name}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="real_name">Real Name</label>
            <input
              id="real_name"
              class="form-input"
              type="text"
              name="real_name"
              bind:value={m.real_name}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="brand">Brand</label>
            <input
              id="brand"
              class="form-input"
              type="text"
              name="brand"
              placeholder="BNK48, CGM48, etc."
              bind:value={m.brand}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="gen">Generation</label>
            <input
              id="gen"
              class="form-input"
              type="text"
              name="gen"
              bind:value={m.gen}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="team">Team</label>
            <input
              id="team"
              class="form-input"
              type="text"
              name="team"
              bind:value={m.team}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="profile_image_url"
              >Profile Image URL</label
            >
            <input
              id="profile_image_url"
              class="form-input"
              type="url"
              name="profile_image_url"
              bind:value={m.profile_image_url}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="graduated_at">Graduated Date</label>
            <input
              id="graduated_at"
              class="form-input"
              type="date"
              name="graduated_at"
              bind:value={m.graduated_at}
            />
          </div>

          <div class="modal-actions">
            <button
              type="submit"
              name={isCreating ? "createMember" : "updateMember"}
              class="btn btn-primary btn-sm"
            >
              {isCreating ? "Add Member" : "Save changes"}
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={closeDetail}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  :root {
    --bnk48: #cb96c2;
    --cgm48: #3cc2b1;
    --mnl48: #01479d;
  }

  .members-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Header ────────────────────────────────────────────────────────────── */
  .page-header {
    padding-bottom: var(--space-xxs);
  }

  /* ── Brand Summary Chips ───────────────────────────────────────────────── */
  .brand-summary {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .brand-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--color-hairline-soft);
    background: var(--white);
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
  }

  .brand-chip:hover,
  .brand-chip.active {
    background: var(--border);
    border-color: var(--ink);
    color: var(--ink);
  }

  .brand-chip-count {
    background: var(--border);
    color: var(--ink);
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }

  /* ── Controls ──────────────────────────────────────────────────────────── */
  .controls-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    width: 100%;
    min-width: 220px;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
    font-size: 14px;
    pointer-events: none;
  }

  .search-input {
    padding-left: 40px !important;
    height: 40px;
    font-size: 14px;
  }

  .filter-tabs {
    display: flex;
    gap: 6px;
  }

  /* ── Error Banner ──────────────────────────────────────────────────────── */

  /* ── Members Grid ──────────────────────────────────────────────────────────
     Paypers-style card: white surface, rounded xl radius, soft shadow on
     hover, photo on top and info below (no dark scrim/gradient overlaid on
     the photo — keeps things flat and airy per design guideline). */
  .members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
    gap: var(--space-md);
  }

  .member-card {
    position: relative;
    padding: 0;
    margin: 0;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: none;
    transition:
      border-color var(--duration-normal) var(--ease-out),
      box-shadow var(--duration-normal) var(--ease-out),
      transform var(--duration-normal) var(--ease-out);
  }

  .member-card:hover,
  .member-card:focus-visible {
    border-color: var(--ink);
    box-shadow: none;
  }

  .member-photo {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    background: var(--card);
    overflow: hidden;
  }

  .member-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
    transition: transform 0.5s var(--ease-out);
  }

  .member-avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-body);
    font-size: 32px;
    font-weight: 700;
    color: var(--brand-color, var(--color-muted));
    opacity: 0.55;
  }

  .graduated-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 26px;
    height: 26px;
    background: var(--white);
    border-radius: var(--radius-pill);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font-size: 12px;
    box-shadow: 0 2px 6px rgba(10, 10, 10, 0.14);
    z-index: 2;
  }

  /* Info now lives in its own block below the photo, separated by a thin
     hairline border — matches the flat, editorial Paypers card pattern
     instead of a caption overlaid on the image. */
  .bar {
    display: flex;
    align-items: center;
    width: 50%;
    justify-content: space-between;
  }

  .member-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border-top: 1px solid var(--border);
  }

  .member-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.3;
  }

  .member-real-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-muted);
    line-height: 1.5;
  }

  .member-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 2px;
  }

  .member-tag {
    font-size: 10px;

    color: var(--color-muted);
    line-height: 1.3;
    white-space: nowrap;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 3, 3, 0.62);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-lg);
  }

  .modal-content {
    width: 100%;
    max-width: 860px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--white);
    border: 1px solid var(--border);
    padding: var(--space-xl);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-card-border);
    padding-bottom: 16px;
  }

  .modal-body {
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    gap: 24px;
    align-items: start;
  }

  .modal-media {
    width: 100%;
  }

  .modal-avatar,
  .modal-avatar-fallback {
    width: 100%;
    border-radius: 8px;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    display: block;
  }

  .modal-avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-soft-stone);
    color: var(--color-muted);
    font-size: 40px;
  }

  .modal-info {
    display: grid;
    gap: 18px;
  }

  .modal-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    grid-column: 1 / -1;
    justify-content: flex-end;
    align-items: center;
    margin-top: 8px;
  }

  /* ── Animations ────────────────────────────────────────────────────────── */
  .fade-in-scale {
    animation: fade-in-scale 0.25s var(--ease-out);
  }

  @keyframes fade-in-scale {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 779px) {
    .members-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: var(--space-sm);
    }

    .bar {
      width: 100%;
    }

    .controls-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-wrap {
      max-width: 100%;
    }

    .modal-body {
      grid-template-columns: 1fr;
    }

    .modal-content {
      padding: 20px;
      max-height: 95vh;
    }
  }

  @media (max-width: 485px) {
    .members-grid {
      display: flex;
      flex-direction: column;
    }

    .member-card {
      flex-direction: row;
    }

    .member-photo {
      height: 125px;
      width: 100px;
    }
  }
</style>
