<script lang="ts">
	import { supabase } from "$lib/supabase";
	import type { EventData } from "$lib/types";
	import { toasts } from "$lib/toasts";
	import { proxyUrl } from "$lib/bnk48";

	let { data } = $props();
	let events: EventData[] = $state([]);
	let showModal = $state(false);
	let editingEvent: Partial<EventData> | null = $state(null);
	let filterMode = $state<"all" | "upcoming" | "past">("all");
	let searchQuery = $state("");

	$effect(() => {
		if (data.events) events = data.events;
	});

	const today = new Date().toISOString().split("T")[0];

	let filteredEvents = $derived(
		events
			.filter((e) => {
				if (!e || !e.title) return false;

				if (filterMode === "upcoming") {
					const isUpcoming =
						e.date >= today || (e.end_date && e.end_date >= today);
					if (!isUpcoming) return false;
				} else if (filterMode === "past") {
					const isPast =
						e.date < today && (!e.end_date || e.end_date < today);
					if (!isPast) return false;
				}

				const matchesSearch =
					e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(e.location &&
						e.location
							.toLowerCase()
							.includes(searchQuery.toLowerCase()));

				return matchesSearch;
			})
			.sort((a, b) => b.date.localeCompare(a.date)),
	);

	let formData = $state({
		title: "",
		date: "",
		end_date: "",
		location: "",
		link: "",
		image_url: "",
		live: "",
	});

	function openAddModal() {
		editingEvent = null;
		formData = {
			title: "",
			date: today,
			end_date: "",
			location: "",
			link: "",
			image_url: "",
			live: "",
		};
		showModal = true;
	}

	function openEditModal(event: EventData) {
		editingEvent = event;
		formData = {
			title: event.title,
			date: event.date,
			end_date: event.end_date ?? "",
			location: event.location ?? "",
			link: event.link ?? "",
			image_url: event.image_url ?? "",
			live: event.live ?? "",
		};
		showModal = true;
	}

	async function handleSubmit() {
		const payload = {
			...formData,
			end_date: formData.end_date || null,
			location: formData.location || null,
			image_url: formData.image_url || null,
			live: formData.live || null,
		};

		if (editingEvent) {
			const { error } = await supabase
				.from("event_data")
				.update(payload)
				.eq("id", editingEvent.id);

			if (error) toasts.add(error.message, "error");
			else {
				const idx = events.findIndex((e) => e.id === editingEvent!.id);
				if (idx !== -1) events[idx] = { ...events[idx], ...payload };
				toasts.add("Event updated successfully", "success");
				showModal = false;
			}
		} else {
			const { data: newEvent, error } = await supabase
				.from("event_data")
				.insert([payload])
				.select();

			if (error) toasts.add(error.message, "error");
			else {
				if (newEvent) events = [newEvent[0], ...events];
				toasts.add("Event added successfully", "success");
				showModal = false;
			}
		}
	}

	async function deleteEvent(id: number) {
		if (!confirm("Are you sure?")) return;
		const { error } = await supabase
			.from("event_data")
			.delete()
			.eq("id", id);
		if (error) toasts.add(error.message, "error");
		else {
			events = events.filter((e) => e.id !== id);
			toasts.add("Event deleted", "success");
		}
	}
</script>

<div class="page-container container">
	<header class="page-header">
		<div class="header-left">
			<span class="mono-label">Mission Ledger</span>
			<h1 class="hero-display">Event Operations</h1>
			<p class="body-large">
				Technical indexing of public appearances, broadcast schedules,
				and group-wide activities.
			</p>
		</div>

		<div class="technical-filter-bar">
			<div class="filter-pills">
				<button
					class="button-pill-outline"
					onclick={() => (filterMode = "all")}
					class:active={filterMode === "all"}
				>
					Global Ledger
				</button>
				<button
					class="button-pill-outline"
					onclick={() => (filterMode = "upcoming")}
					class:active={filterMode === "upcoming"}
				>
					Upcoming
				</button>
				<button
					class="button-pill-outline"
					onclick={() => (filterMode = "past")}
					class:active={filterMode === "past"}
				>
					Archives
				</button>
			</div>

			<div class="technical-input-group search-box">
				<i class="fa-solid fa-magnifying-glass opacity-50"></i>
				<input
					type="text"
					placeholder="Search operations..."
					bind:value={searchQuery}
				/>
			</div>

			<button class="button-pill-outline" onclick={openAddModal}>
				Create Record
			</button>
		</div>
	</header>

	{#if filteredEvents.length === 0}
		<div class="status-stream">
			<div class="status-node">
				<i class="fa-solid fa-calendar-xmark me-2 opacity-50"></i>
				<span class="mono-label">NO_RECORDS_MATCH_QUERY</span>
			</div>
		</div>
	{:else}
		<div class="row row-cols-1 row-cols-lg-2 g-4 editorial-grid">
			{#each filteredEvents as event (event.id)}
				<div class="col d-flex justify-content-center">
					<div class="node-media">
						{#if event.image_url}
							<img src={proxyUrl(event.image_url)} alt="" loading="lazy" />
						{:else}
							<div class="media-placeholder">
								<i class="fa-solid fa-cube"></i>
							</div>
						{/if}
						<div
							class="node-status {new Date(event.date) >=
							new Date(today)
								? 'upcoming'
								: 'archived'}"
						>
							{new Date(event.date) >= new Date(today)
								? "UPCOMING"
								: "PAST"}
						</div>
					</div>

					<div class="mx-3 node-details">
						<div class="node-meta">
							<span class="mono-label">
								DATE: {new Date(event.date)
									.toLocaleDateString("en-US", {
										year: "numeric",
										month: "2-digit",
										day: "2-digit",
									})
									.replace(/\//g, ".")}
							</span>
							{#if event.location}
								<span class="separator">/</span>
								<span class="mono-label"
									>LOC: {event.location.toUpperCase()}</span
								>
							{/if}
						</div>
						<h3 class="node-title">{event.title}</h3>

						<div class="node-ops">
							<div class="ops-left">
								<button
									class="action-icon-btn"
									onclick={() => openEditModal(event)}
									aria-label="Edit record"
								>
									<i class="fa-solid fa-pen-to-square"></i>
								</button>
								<button
									class="action-icon-btn danger"
									onclick={() => deleteEvent(event.id)}
									aria-label="Delete record"
								>
									<i class="fa-solid fa-trash"></i>
								</button>
							</div>
							<div class="ops-right">
								{#if event.link}
									<button
										onclick={() => window.open(proxyUrl(event.link), '_blank')}
										class="button-pill-outline btn-small"
									>
										Access URI <i
											class="fa-solid fa-arrow-up-right-from-square ms-2"
										></i>
									</button>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal-overlay"
		onclick={() => (showModal = false)}
		role="presentation"
	>
		<div
			class="record-form-card"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<header class="form-header">
				<h3 class="technical-title">
					{editingEvent ? "Update Record" : "New Operation Entry"}
				</h3>
				<button
					class="close-trigger"
					onclick={() => (showModal = false)}
					aria-label="Close"
				>
					<i class="fa-solid fa-xmark"></i>
				</button>
			</header>

			<form
				class="form-core"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="form-section">
					<span class="mono-label">OPERATION_TITLE</span>
					<div class="input-field">
						<input
							type="text"
							bind:value={formData.title}
							required
							placeholder="Designation of activity"
						/>
					</div>
				</div>

				<div class="form-row">
					<div class="form-section flex-1">
						<span class="mono-label">START_TIME</span>
						<div class="input-field">
							<input
								type="date"
								bind:value={formData.date}
								required
							/>
						</div>
					</div>
					<div class="form-section flex-1">
						<span class="mono-label">END_TIME</span>
						<div class="input-field">
							<input
								type="date"
								bind:value={formData.end_date}
								placeholder="Optional"
							/>
						</div>
					</div>
				</div>

				<div class="form-section">
					<span class="mono-label">GEOGRAPHIC_COORD</span>
					<div class="input-field">
						<input
							type="text"
							bind:value={formData.location}
							placeholder="Venue or virtual node"
						/>
					</div>
				</div>

				<div class="form-section">
					<span class="mono-label">RECORDS_IDENTIFIER_URI</span>
					<div class="input-field">
						<input
							type="url"
							bind:value={formData.link}
							placeholder="Source documentation"
						/>
					</div>
				</div>

				<div class="form-section">
					<span class="mono-label">VISUAL_INDEX_ASSET</span>
					<div class="input-field with-preview">
						<input
							type="url"
							bind:value={formData.image_url}
							placeholder="https://..."
						/>
						{#if formData.image_url}
							<img
								src={proxyUrl(formData.image_url)}
								alt="Preview"
								class="field-preview"
							/>
						{/if}
					</div>
				</div>

				<div class="form-section">
					<span class="mono-label">BROADCAST_ENDPOINT</span>
					<div class="input-field">
						<input
							type="url"
							bind:value={formData.live}
							placeholder="Live stream link"
						/>
					</div>
				</div>

				<footer class="form-footer">
					<button
						type="button"
						class="button-pill-outline"
						onclick={() => (showModal = false)}
					>
						Discard
					</button>
					<button type="submit" class="button-primary">
						{editingEvent
							? "Commit Changes"
							: "Initialize Operation"}
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}

<style>
	.page-container {
		animation: fade-in 0.6s ease-out;
	}

	.hero-display {
		font-size: 72px;
		line-height: 1;
		margin: 8px 0 24px;
	}

	.body-large {
		font-size: 18px;
		color: var(--co-slate-muted);
		max-width: 600px;
	}


	.filter-pills {
		display: flex;
		gap: 8px;
	}

	.search-box {
		background: var(--co-stone);
		border-radius: var(--radius-sm);
		padding: 10px 20px;
		display: flex;
		align-items: center;
		gap: 12px;
		border: 1px solid var(--co-hairline);
		flex: 1;
		min-width: 250px;
	}

	.search-box input {
		background: none;
		border: none;
		outline: none;
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--co-ink);
		width: 100%;
	}

	/* Status Stream */
	.status-stream {
		display: flex;
		justify-content: center;
		margin: 80px 0;
	}

	.action-icon-btn {
		border-radius: 50%;
		aspect-ratio: 1/1;
		background-color: transparent;
		width: 38px;
		border: 1px solid var(--co-hairline);
	}

	.action-icon-btn:hover {
		background-color: var(--co-ink);
		color: var(--co-white);
		cursor: pointer;
	}

	.action-icon-btn.danger {
		color: var(--bs-danger);
		border: 1px solid var(--bs-danger);
	}

	.action-icon-btn.danger:hover {
		background-color: var(--bs-danger);
		color: var(--co-white);
	}

	.status-node {
		background: var(--co-black);
		color: var(--co-white);
		padding: 12px 24px;
		border-radius: var(--radius-pill);
		display: flex;
		align-items: center;
		font-size: 12px;
	}


	.node-media {
		height: 150px;
		width: 150px;
		min-height: 150px;
		min-width: 150px;
		aspect-ratio: 1/1;
		border-radius: var(--radius-md);
		overflow: hidden;
		position: relative;
		background: var(--co-stone);
		border: 1px solid var(--co-hairline);
	}

	.node-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.media-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 48px;
		color: var(--co-hairline);
	}

	.node-status {
		position: absolute;
		top: 12px;
		right: 12px;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.technical-filter-bar {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 24px 0;
		border-bottom: 1px solid var(--co-hairline);
		margin-bottom: 48px;
		flex-wrap: wrap;
	}

	.node-status.upcoming {
		background: var(--co-coral);
		color: var(--co-white);
	}

	.node-status.archived {
		background: var(--co-slate-muted);
		color: var(--co-white);
	}

	.node-details {
		flex: 1;
	}

	.node-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--co-slate-muted);
	}

	.node-meta .separator {
		opacity: 0.3;
	}

	.node-title {
		font-size: 28px;
		line-height: 1.2;
		margin: 0;
	}

	.node-ops {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 16px;
		padding-top: 24px;
		border-top: 1px solid var(--co-hairline);
	}

	.ops-left,
	.ops-right {
		display: flex;
		gap: 12px;
	}

	.btn-small {
		padding: 6px 16px;
		font-size: 12px;
	}

	/* Record Form Card (Consistent with Members) */
	.record-form-card {
		width: 100%;
		max-width: 600px;
		background: var(--co-white);
		border-radius: var(--radius-lg);
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		animation: slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.form-header {
		padding: 32px 40px;
		border-bottom: 1px solid var(--co-hairline);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--co-stone);
	}

	.form-core {
		padding: 40px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.form-row {
		display: flex;
		gap: 24px;
	}

	.input-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}


	.input-field input {
		padding: 14px 20px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--co-hairline);
		background: var(--co-stone);
		font-family: var(--font-body);
		font-size: 15px;
		outline: none;
		transition: border-color 0.2s;
	}

	.input-field input:focus {
		border-color: var(--co-blue);
	}

	.with-preview {
		flex-direction: row;
		align-items: center;
		gap: 16px;
	}

	.field-preview {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-xs);
		object-fit: cover;
		border: 1px solid var(--co-hairline);
	}

	.form-footer {
		padding-top: 24px;
		border-top: 1px solid var(--co-hairline);
		display: flex;
		justify-content: flex-end;
		gap: 16px;
	}

	@media (max-width: 900px) {
	}

	@media (max-width: 768px) {
		.hero-display {
			font-size: 48px;
		}
		.editorial-grid {
			gap: 24px;
		}
		.form-row {
			flex-direction: column;
			gap: 32px;
		}
	}
</style>
