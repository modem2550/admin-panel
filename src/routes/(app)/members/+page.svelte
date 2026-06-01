<script lang="ts">
	import { supabase } from "$lib/supabase";
	import type { Member } from "$lib/types";
	import { toasts } from "$lib/toasts";
	import { proxyUrl } from "$lib/bnk48";

	let { data } = $props();
	let members: Member[] = $state([]);
	let showModal = $state(false);
	let editingMember: Partial<Member> | null = $state(null);

	$effect(() => {
		if (data.members) members = data.members;
	});

	let searchQuery = $state("");
	let filterBrand = $state("All");
	let filterStatus = $state("Active");
	let filterGen = $state("All");
	let filterTeam = $state("All");

	let availableGens = $derived([
		"All",
		...Array.from(new Set(members.map((m) => m.gen).filter(Boolean))),
	]);
	let availableTeams = $derived([
		"All",
		...Array.from(new Set(members.map((m) => m.team).filter(Boolean))),
	]);

	let filteredMembers = $derived(
		members.filter((m) => {
			if (!m || !m.name) return false;
			const matchesSearch = m.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			const matchesBrand =
				filterBrand === "All" || m.brand === filterBrand;
			const matchesStatus =
				filterStatus === "All" ||
				(filterStatus === "Active" && !m.graduated_at) ||
				(filterStatus === "Graduated" && !!m.graduated_at);
			const matchesGen = filterGen === "All" || m.gen === filterGen;
			const matchesTeam = filterTeam === "All" || m.team === filterTeam;

			return (
				matchesSearch &&
				matchesBrand &&
				matchesStatus &&
				matchesGen &&
				matchesTeam
			);
		}),
	);

	let formData = $state({
		name: "",
		brand: "BNK48",
		gen: "Unknown",
		team: "Trainee",
		profile_image_url: "",
		// FIX: use empty string instead of null — <input type="date"> shows "null" text if bound to null
		graduated_at: "" as string,
	});

	function openAddModal() {
		editingMember = null;
		formData = {
			name: "",
			brand: "BNK48",
			gen: "Unknown",
			team: "Trainee",
			profile_image_url: "",
			graduated_at: "",
		};
		showModal = true;
	}

	function openEditModal(member: Member) {
		editingMember = member;
		formData = {
			name: member.name,
			brand: member.brand,
			gen: member.gen,
			team: member.team,
			profile_image_url: member.profile_image_url || "",
			// FIX: convert null to empty string for date input
			graduated_at: member.graduated_at ?? "",
		};
		showModal = true;
	}

	async function handleSubmit() {
		// FIX: convert empty string back to null before saving to DB
		const payload = {
			...formData,
			graduated_at: formData.graduated_at || null,
		};

		if (editingMember) {
			const { error } = await supabase
				.from("members")
				.update(payload)
				.eq("id", editingMember.id);

			if (error) toasts.add(error.message, "error");
			else {
				const idx = members.findIndex(
					(m) => m.id === editingMember!.id,
				);
				if (idx !== -1) members[idx] = { ...members[idx], ...payload };
				toasts.add("Member updated successfully", "success");
				showModal = false;
			}
		} else {
			const { data: newMember, error } = await supabase
				.from("members")
				.insert([payload])
				.select();

			if (error) toasts.add(error.message, "error");
			else {
				if (newMember) members = [...members, newMember[0]];
				toasts.add("Member added successfully", "success");
				showModal = false;
			}
		}
	}

	async function deleteMember(id: number) {
		if (!confirm("Are you sure?")) return;
		const { error } = await supabase.from("members").delete().eq("id", id);
		if (error) toasts.add(error.message, "error");
		else {
			members = members.filter((m) => m.id !== id);
			toasts.add("Member deleted", "success");
		}
	}
</script>

<div class="page-shell">
	<div class="co-page-hero">
		<div class="co-page-hero__main">
			<span class="mono-label">Personnel directory</span>
			<h1 class="hero-display">Collective registry</h1>
			<p class="body-large">
				Operational management of member records, generation indexing,
				and active status tracking.
			</p>
		</div>
		<div class="co-page-hero__actions">
			<button type="button" class="button-primary" onclick={openAddModal}>
				Add entry <i class="fa-solid fa-plus ms-2"></i>
			</button>
			<div class="filter-group flex-1">
				<div class="search-box">
					<i
						class="fa-solid fa-magnifying-glass opacity-50"
						aria-hidden="true"
					></i>
					<input
						type="search"
						placeholder="Search entries..."
						bind:value={searchQuery}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="technical-filter-bar">
		<div class="filter-group">
			<div class="filter-pills">
				<button
					type="button"
					class="button-pill-outline taxonomy-chip"
					onclick={() => (filterBrand = "All")}
					class:active={filterBrand === "All"}
				>
					All
				</button>
				<button
					type="button"
					class="button-pill-outline taxonomy-chip"
					onclick={() => (filterBrand = "BNK48")}
					class:active={filterBrand === "BNK48"}
				>
					BNK48
				</button>
				<button
					type="button"
					class="button-pill-outline taxonomy-chip"
					onclick={() => (filterBrand = "CGM48")}
					class:active={filterBrand === "CGM48"}
				>
					CGM48
				</button>
			</div>
		</div>

		<div class="filter-group">
			<div class="technical-select">
				<select bind:value={filterGen}>
					<option value="All">All generations</option>
					{#each availableGens.filter((g) => g !== "All") as gen}
						<option value={gen}>{gen}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="filter-group">
			<div class="technical-select">
				<select bind:value={filterTeam}>
					<option value="All">All teams</option>
					{#each availableTeams.filter((t) => t !== "All") as team}
						<option value={team}>{team}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="filter-group">
			<div class="technical-select">
				<select bind:value={filterStatus}>
					<option value="All">All</option>
					<option value="Active">Active</option>
					<option value="Graduated">Graduated</option>
				</select>
			</div>
		</div>
	</div>

	{#if filteredMembers.length === 0}
		<div class="status-stream">
			<div class="status-node">
				<i
					class="fa-solid fa-user-slash me-2 opacity-50"
					aria-hidden="true"
				></i>
				<span class="mono-label">No entries match filters</span>
			</div>
		</div>
	{:else}
		<div class="data-table-wrap data-table-wrap--scroll">
			<table class="data-table data-table--zebra data-table--sticky">
				<thead>
					<tr>
						<th scope="col" class="data-table__thumb">Visual</th>
						<th scope="col">State</th>
						<th scope="col">Unit</th>
						<th scope="col">Identity</th>
						<th scope="col" class="data-table__actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredMembers as member (member.id)}
						<tr>
							<td class="data-table__thumb">
								{#if member.profile_image_url}
									<img
										src={proxyUrl(member.profile_image_url)}
										alt={member.name}
										loading="lazy"
									/>
								{:else}
									<div class="data-table__thumb-placeholder">
										{member.name?.charAt(0) ?? "—"}
									</div>
								{/if}
							</td>
							<td>
								<h3 class="data-table__title">{member.name}</h3>
							</td>
							<td>
								<span
									class="data-table__chip {member.graduated_at
										? 'data-table__chip--muted'
										: 'data-table__chip--live'}"
								>
									{member.graduated_at ? "Alumni" : "Active"}
								</span>
							</td>
							<td class="data-table__meta">
								<span>{member.brand}</span>
								<span class="sep">/</span>
								<span>{member.gen}</span>
								<span class="sep">/</span>
								<span>{member.team}</span>
							</td>
							<td class="data-table__actions">
								<div class="data-table__ops">
									<button
										type="button"
										class="action-icon-btn"
										onclick={() => openEditModal(member)}
										aria-label="Edit entry"
									>
										<i class="fa-solid fa-pen-to-square"
										></i>
									</button>
									<button
										type="button"
										class="action-icon-btn danger"
										onclick={() => deleteMember(member.id)}
										aria-label="Delete entry"
									>
										<i class="fa-solid fa-trash"></i>
									</button>
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
					{editingMember ? "Update Record" : "New Entry"}
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
				<div class="form-section mt-3">
					<span class="mono-label">PRIMARY_IDENTITY</span>
					<div class="input-field">
						<label for="member-name">Legal/Stage Name</label>
						<input
							id="member-name"
							type="text"
							bind:value={formData.name}
							required
							placeholder="Enter identifier"
						/>
					</div>
				</div>

				<div class="form-row mt-3">
					<div class="form-section flex-1">
						<span class="mono-label">ORGANIZATION</span>
						<div class="input-field">
							<select bind:value={formData.brand}>
								<option value="BNK48">BNK48</option>
								<option value="CGM48">CGM48</option>
							</select>
						</div>
					</div>
					<div class="form-section flex-1">
						<span class="mono-label">GENERATION</span>
						<div class="input-field">
							<input
								type="text"
								bind:value={formData.gen}
								placeholder="e.g. 5th Gen"
							/>
						</div>
					</div>
				</div>

				<div class="form-section mt-3">
					<span class="mono-label">UNIT_ASSIGNMENT</span>
					<div class="input-field">
						<input
							type="text"
							bind:value={formData.team}
							placeholder="e.g. Trainee / Team BIII"
						/>
					</div>
				</div>

				<div class="form-section mt-3">
					<span class="mono-label">VISUAL_ASSET</span>
					<div class="input-field with-preview form-row">
						<input
							type="url"
							bind:value={formData.profile_image_url}
							placeholder="https://asset-repository.co/profile.jpg"
						/>
						{#if formData.profile_image_url}
							<img
								src={proxyUrl(formData.profile_image_url)}
								alt="Preview"
								class="field-preview"
							/>
						{/if}
					</div>
				</div>

				<div class="form-section mt-3">
					<span class="mono-label">LIFECYCLE_STATE</span>
					<div class="input-field">
						<label for="member-graduated"
							>Archival Date (Graduation)</label
						>
						<input
							id="member-graduated"
							type="date"
							bind:value={formData.graduated_at}
						/>
					</div>
				</div>

				<footer class="form-footer mt-3">
					<button
						type="button"
						class="button-secondary"
						onclick={() => (showModal = false)}
					>
						Discard
					</button>
					<button type="submit" class="button-primary">
						{editingMember ? "Save changes" : "Create record"}
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}
