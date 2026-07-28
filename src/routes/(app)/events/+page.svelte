<script lang="ts">
  import type { PageData } from "./$types";
  import type { EventItem } from "./+page.server";
  import { enhance } from "$app/forms";

  let { data }: { data: PageData } = $props();

  let events = $derived(data.events as EventItem[]);
  let loadError = $derived(data.error as string | null);

  // ── Search & Filter ────────────────────────────────────────────────────────
  let searchQuery = $state("");
  let filterUpcoming = $state<"all" | "upcoming" | "past">("all");
  let editEvent = $state<EventItem | null>(null);
  let isCreating = $state(false);
  let imageUrlsText = $state("");

  function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  let filtered = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    const today = getLocalDateString();

    return events.filter((ev) => {
      const matchQuery =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        (ev.location ?? "").toLowerCase().includes(q) ||
        (ev.live ?? "").toLowerCase().includes(q);

      const endDate = ev.end_date || ev.date;
      const matchTime =
        filterUpcoming === "all"
          ? true
          : filterUpcoming === "upcoming"
            ? endDate >= today
            : endDate < today;

      return matchQuery && matchTime;
    });
  });

  // ── Selected Event (detail modal) ─────────────────────────────────────────

  function normalizeDate(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toISOString().slice(0, 10);
  }

  function openDetail(ev: EventItem) {
    isCreating = false;
    editEvent = {
      ...ev,
      date: normalizeDate(ev.date),
      end_date: normalizeDate(ev.end_date),
    };
    imageUrlsText = (ev.image_urls ?? []).join("\n");
  }

  function openCreate() {
    isCreating = true;
    editEvent = {
      id: 0,
      title: "",
      date: normalizeDate(new Date().toISOString()),
      end_date: null,
      location: null,
      link: null,
      image_url: null,
      live: null,
      image_urls: null,
      image_path: null,
      updated_at: new Date().toISOString(),
    };
    imageUrlsText = "";
  }

  function closeDetail() {
    editEvent = null;
    isCreating = false;
    imageUrlsText = "";
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatDate(dateStr: string): string {
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

  function isUpcoming(dateStr: string): boolean {
    const today = getLocalDateString();
    return dateStr > today;
  }

  function isOngoing(ev: EventItem): boolean {
    const today = getLocalDateString();
    const start = ev.date;
    const end = ev.end_date || start;
    return start <= today && today <= end;
  }
</script>

<svelte:head>
  <title>Events — Admin Panel</title>
</svelte:head>

<div class="events-page fade-in">
  <!-- Header -->
  <div
    class="page-header"
    style="display: flex; justify-content: space-between; align-items: flex-start;"
  >
    <div>
      <p class="text-mono-label page-label">Database</p>
      <h1 class="page-title">Events</h1>
      <p class="page-desc">
        Browse BNK48 / CGM48 events and concerts from the Supabase database.
      </p>
    </div>
    <button
      class="btn btn-primary"
      style="margin-top: 12px;"
      onclick={openCreate}
    >
      <i class="ti ti-plus"></i> Add Event
    </button>
  </div>

  <!-- Controls -->
  <div class="controls-bar">
    <div class="search-wrap">
      <i class="ti ti-magnifying-glass search-icon"></i>
      <input
        id="events-search"
        class="form-input search-input"
        type="search"
        placeholder="Search events…"
        bind:value={searchQuery}
      />
    </div>

    <div class="filter-tabs">
      {#each [["all", "All"], ["upcoming", "Upcoming"], ["past", "Past"]] as [val, label]}
        <button
          class="btn btn-pill-outline btn-sm"
          class:active={filterUpcoming === val}
          onclick={() => (filterUpcoming = val as any)}
        >
          {label}
        </button>
      {/each}
    </div>

    <span
      class="text-caption"
      style="color: var(--color-muted); margin-left: auto;"
    >
      {filtered.length} / {events.length} events
    </span>
  </div>

  <!-- Error -->
  {#if loadError}
    <div class="error-banner">
      <i class="ti ti-alert-circle"></i>
      <span>{loadError}</span>
    </div>
  {/if}

  <!-- Empty -->
  {#if events.length === 0 && !loadError}
    <div class="empty-state">
      <i class="ti ti-calendar-x"></i>
      <p>No events found in the database.</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      <i class="ti ti-filter-circle-xmark"></i>
      <p>No events match your search.</p>
    </div>
  {:else}
    <!-- Grid -->
    <div class="events-grid">
      {#each filtered as ev (ev.id)}
        <button
          class="event-card card"
          onclick={() => openDetail(ev)}
          aria-label="View details for {ev.title}"
        >
          <!-- Thumbnail -->
          <div class="event-thumb-wrap">
            {#if ev.image_url}
              <img
                src={ev.image_url}
                alt={ev.title}
                class="event-thumb"
                loading="lazy"
              />
            {:else}
              <div class="event-thumb event-thumb-placeholder">
                <i class="ti ti-calendar-star"></i>
              </div>
            {/if}

            <!-- Status badge -->
            <div class="event-status-badge">
              {#if isOngoing(ev)}
                <span class="chip chip-processing">
                  <span class="chip-dot pulse"></span>
                  Ongoing
                </span>
              {:else if isUpcoming(ev.date)}
                <span class="chip chip-completed">Upcoming</span>
              {:else}
                <span class="chip chip-queued">Past</span>
              {/if}
            </div>

            <!-- Hover overlay -->
            <div class="event-overlay">
              <i class="ti ti-arrow-up-right-from-square"></i>
            </div>
          </div>

          <!-- Info -->
          <div class="event-info">
            <h3 class="event-title">{ev.title}</h3>

            <div class="event-meta">
              <span class="meta-row">
                <i class="ti ti-calendar"></i>
                {formatDate(ev.date)}{ev.end_date
                  ? " – " + formatDate(ev.end_date)
                  : ""}
              </span>
              {#if ev.location}
                <span class="meta-row">
                  <i class="ti ti-location-dot"></i>
                  {ev.location}
                </span>
              {/if}
              {#if ev.live}
                <span class="meta-row">
                  <i class="ti ti-tower-broadcast"></i>
                  {ev.live}
                </span>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- ── Detail Modal ─────────────────────────────────────────────────────── -->
{#if editEvent}
  {@const ev = editEvent}
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
          {isCreating ? "Create Event" : "Edit Event"}
        </h2>
        <button class="btn-icon" aria-label="Close" onclick={closeDetail}>
          <i class="ti ti-x"></i>
        </button>
      </div>

      <form
        method="post"
        action={isCreating ? "?/createEvent" : "?/updateEvent"}
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
          <input type="hidden" name="id" value={editEvent.id} />
        {/if}
        <input type="hidden" name="table" value={data.eventTable ?? "events"} />

        <div class="modal-media">
          {#if ev.image_url}
            <img src={ev.image_url} alt={ev.title} class="modal-image" />
          {:else}
            <div class="modal-image-placeholder">
              <i class="ti ti-calendar-star"></i>
            </div>
          {/if}
        </div>

        <div class="modal-info modal-form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="title">Title</label>
            <input
              id="title"
              class="form-input"
              type="text"
              name="title"
              required
              bind:value={ev.title}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="date">Date</label>
            <input
              id="date"
              class="form-input"
              type="date"
              name="date"
              bind:value={ev.date}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="end_date">End Date</label>
            <input
              id="end_date"
              class="form-input"
              type="date"
              name="end_date"
              bind:value={ev.end_date}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="location">Location</label>
            <input
              id="location"
              class="form-input"
              type="text"
              name="location"
              bind:value={ev.location}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="link">Link</label>
            <input
              id="link"
              class="form-input"
              type="url"
              name="link"
              bind:value={ev.link}
            />
          </div>

          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="image_url">Image URL</label>
            <input
              id="image_url"
              class="form-input"
              type="url"
              name="image_url"
              bind:value={ev.image_url}
            />
          </div>

          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="image_urls"
              >Image URLs (One per line)</label
            >
            <textarea
              id="image_urls"
              class="form-input"
              name="image_urls"
              rows="4"
              bind:value={imageUrlsText}
              style="resize: vertical; font-family: var(--font-mono); font-size: 13px;"
            ></textarea>
          </div>

          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label" for="live">Live</label>
            <input
              id="live"
              class="form-input"
              type="text"
              name="live"
              bind:value={ev.live}
            />
          </div>

          <div class="modal-actions" style="grid-column: 1 / -1;">
            <button
              type="submit"
              name={isCreating ? "createEvent" : "updateEvent"}
              class="btn btn-primary btn-sm"
            >
              {isCreating ? "Create Event" : "Save changes"}
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
  .events-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .page-header {
    padding-bottom: var(--space-xxs);
  }
  .controls-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 360px;
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

  /* ── Controls ──────────────────────────────────────────────────────────── */
  .events-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .event-card {
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    width: 100%;
    border: 1px solid var(--border);
    background: var(--white);
    transition: border-color var(--duration-normal) var(--ease-out);
    display: flex;
  }

  .event-thumb-wrap {
    max-width: 150px;
    max-height: 187.5px;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    aspect-ratio: 4 / 5;
    background: var(--card);
  }

  .event-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .event-thumb-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font-size: 32px;
    opacity: 0.4;
  }

  .event-status-badge {
    position: absolute;
    top: 10px;
    left: 10px;
  }

  .event-overlay {
    position: absolute;
    width: 150px;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  .event-card:hover .event-overlay {
    opacity: 1;
  }

  /* Card Info */
  .event-info {
    padding: 14px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .event-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .event-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 12px;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .meta-row i {
    font-size: 11px;
    margin-top: 2px;
    flex-shrink: 0;
    width: 14px;
    text-align: center;
  }

  /* ── Modal ─────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 3, 3, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-lg);
  }

  .modal-content {
    width: 100%;
    height: 100%;
    max-width: 780px;
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
    grid-template-columns: 1fr 1.6fr;
    gap: 28px;
    align-items: start;
  }

  .modal-media {
    width: 100%;
  }

  .modal-image {
    width: 100%;
    border-radius: 8px;
    object-fit: cover;
    aspect-ratio: 3 / 4;
    display: block;
  }

  .modal-image-placeholder {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 8px;
    background: var(--color-soft-stone);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font-size: 48px;
    opacity: 0.4;
  }

  .modal-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    align-items: center;
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
  @media (max-width: 768px) {
    .controls-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-wrap {
      max-width: 100%;
    }

    .events-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .modal-body {
      grid-template-columns: 1fr;
    }

    .modal-content {
      padding: 20px;
      max-height: 95vh;
    }

    .modal-image,
    .modal-image-placeholder {
      aspect-ratio: 16 / 9;
    }
  }
</style>
