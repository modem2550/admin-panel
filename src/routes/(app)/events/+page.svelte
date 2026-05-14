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

<div class="page-shell">
	<div class="co-page-hero">
		<div class="co-page-hero__main">
			<span class="mono-label">Mission ledger</span>
			<h1 class="hero-display">Event operations</h1>
			<p class="body-large">
				Technical indexing of public appearances, broadcast schedules,
				and group-wide activities.
			</p>
		</div>
		<div class="co-page-hero__actions">
			<button type="button" class="button-primary" onclick={openAddModal}>
				Create event <i class="fa-solid fa-plus ms-2"></i>
			</button>
			<div class="search-box">
				<i
					class="fa-solid fa-magnifying-glass opacity-50"
					aria-hidden="true"
				></i>
				<input
					type="search"
					placeholder="Search operations..."
					bind:value={searchQuery}
				/>
			</div>
		</div>
	</div>

	<div class="technical-filter-bar">
		<div class="filter-pills">
			<button
				type="button"
				class="button-pill-outline taxonomy-chip"
				onclick={() => (filterMode = "all")}
				class:active={filterMode === "all"}
			>
				Global ledger
			</button>
			<button
				type="button"
				class="button-pill-outline taxonomy-chip"
				onclick={() => (filterMode = "upcoming")}
				class:active={filterMode === "upcoming"}
			>
				Upcoming
			</button>
			<button
				type="button"
				class="button-pill-outline taxonomy-chip"
				onclick={() => (filterMode = "past")}
				class:active={filterMode === "past"}
			>
				Archives
			</button>
		</div>
	</div>

	{#if filteredEvents.length === 0}
		<div class="status-stream">
			<div class="status-node">
				<i class="fa-solid fa-calendar-xmark me-2 opacity-50"></i>
				<span class="mono-label">No records match query</span>
			</div>
		</div>
	{:else}
		<div class="data-table-wrap data-table-wrap--scroll">
			<table class="data-table data-table--zebra data-table--sticky">
				<thead>
					<tr>
						<th scope="col" class="data-table__thumb">Visual</th>
						<th scope="col">State</th>
						<th scope="col">Date</th>
						<th scope="col">Location</th>
						<th scope="col">Operation</th>
						<th scope="col" class="data-table__actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredEvents as event (event.id)}
						<tr>
							<td class="data-table__thumb">
								{#if event.image_url}
									<img
										src={proxyUrl(event.image_url)}
										alt=""
										loading="lazy"
									/>
								{:else}
									<div
										class="data-table__thumb-placeholder"
										aria-hidden="true"
									>
										<i class="fa-solid fa-cube"></i>
									</div>
								{/if}
							</td>
							<td>
								<span
									class="data-table__chip {new Date(
										event.date,
									) >= new Date(today)
										? 'data-table__chip--live'
										: 'data-table__chip--muted'}"
								>
									{new Date(event.date) >= new Date(today)
										? "Live"
										: "Archive"}
								</span>
							</td>
							<td class="data-table__meta">
								{new Date(event.date)
									.toLocaleDateString("en-US", {
										year: "numeric",
										month: "2-digit",
										day: "2-digit",
									})
									.replace(/\//g, ".")}
							</td>
							<td class="data-table__meta"
								>{event.location ?? "—"}</td
							>
							<td>
								<h3 class="data-table__title">{event.title}</h3>
							</td>
							<td class="data-table__actions">
								<div class="data-table__ops">
									<button
										type="button"
										class="action-icon-btn"
										onclick={() => openEditModal(event)}
										aria-label="Edit record"
									>
										<i class="fa-solid fa-pen-to-square"
										></i>
									</button>
									<button
										type="button"
										class="action-icon-btn danger"
										onclick={() => deleteEvent(event.id)}
										aria-label="Delete record"
									>
										<i class="fa-solid fa-trash"></i>
									</button>
									{#if event.link}
										<button
											type="button"
											onclick={() =>
												window.open(
													proxyUrl(event.link),
													"_blank",
												)}
											class="button-pill-outline btn-small"
										>
											URI <i
												class="fa-solid fa-arrow-up-right-from-square ms-2"
											></i>
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="gallery-overlay"
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

				<div class="form-row">
					<div>
						<span class="mono-label">RECORDS_IDENTIFIER_URI</span>
						<div class="input-field">
							<input
								type="url"
								bind:value={formData.link}
								placeholder="Source documentation"
							/>
						</div>
					</div>
					<div>
						<span class="mono-label">BROADCAST_ENDPOINT</span>
						<div class="input-field">
							<input
								type="url"
								bind:value={formData.live}
								placeholder="Live stream link"
							/>
						</div>
					</div>
				</div>

				<div class="form-section">
					<span class="mono-label">VISUAL_INDEX_ASSET</span>
					<div class="input-field with-preview form-row">
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

				<footer class="form-footer">
					<button
						type="button"
						class="button-secondary"
						onclick={() => (showModal = false)}
					>
						Discard
					</button>
					<button type="submit" class="button-primary">
						{editingEvent ? "Save changes" : "Create event"}
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}
