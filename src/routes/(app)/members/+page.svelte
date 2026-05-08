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
	let filterStatus = $state("All");
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

<div class="page-container container">
	<header class="page-header">
		<div class="header-left">
			<span class="mono-label">Personnel Directory</span>
			<h1 class="hero-display">Collective Registry</h1>
			<p class="body-large">
				Operational management of member records, generation indexing,
				and active status tracking.
			</p>
		</div>

		<div class="header-actions">
			<button class="button-pill-outline" onclick={openAddModal}>
				Add Entry <i class="fa-solid fa-plus ms-2"></i>
			</button>
		</div>
	</header>

	<div class="technical-filter-bar">
		<div class="filter-group flex-1">
			<div class="technical-input-group search-box">
				<i class="fa-solid fa-magnifying-glass opacity-50"></i>
				<input
					type="text"
					placeholder="Search entries..."
					bind:value={searchQuery}
				/>
			</div>
		</div>

		<div class="filter-group">
			<div class="filter-pills">
				<button
					class="button-pill-outline"
					onclick={() => (filterBrand = "All")}
					class:active={filterBrand === "All"}
				>
					All
				</button>
				<button
					class="button-pill-outline"
					onclick={() => (filterBrand = "BNK48")}
					class:active={filterBrand === "BNK48"}
				>
					BNK48
				</button>
				<button
					class="button-pill-outline"
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
					<option value="All">All Generations</option>
					{#each availableGens.filter((g) => g !== "All") as gen}
						<option value={gen}>{gen}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="filter-group">
			<div class="technical-select">
				<select bind:value={filterTeam}>
					<option value="All">All Teams</option>
					{#each availableTeams.filter((t) => t !== "All") as team}
						<option value={team}>{team}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="filter-group">
			<div class="technical-select">
				<select bind:value={filterStatus}>
					<option value="All">Global Status</option>
					<option value="Active">Active Duty</option>
					<option value="Graduated">Graduated</option>
				</select>
			</div>
		</div>
	</div>

	<div class="row row-cols-1 row-cols-lg-2 g-4">
		{#each filteredMembers as member}
			<div class="col d-flex justify-content-center member-node">
				<div class="node-media">
					{#if member.profile_image_url}
						<img
							src={proxyUrl(member.profile_image_url)}
							alt={member.name}
							loading="lazy"
						/>
					{:else}
						<div class="media-placeholder">
							{member.name?.charAt(0)}
						</div>
					{/if}
					<div
						class="node-status {member.graduated_at
							? 'graduated'
							: 'active'}"
					>
						{member.graduated_at ? "GRADUATED" : "ACTIVE"}
					</div>
				</div>

				<div class="node-details">
					<div class="node-meta">
						<span class="separator">/</span>
						<span class="mono-label">ORG: {member.brand}</span>
						<span class="separator">/</span>
						<span class="mono-label">{member.gen}</span>
					</div>
					<h3 class="node-title">{member.name}</h3>
					<div class="node-sub">
						<span class="technical-tag">UNIT: {member.team}</span>
					</div>

					<div class="node-ops">
						<div class="ops-left">
							<button
								class="action-icon-btn"
								onclick={() => openEditModal(member)}
								aria-label="Edit entry"
							>
								<i class="fa-solid fa-pen-to-square"></i>
							</button>
							<button
								class="action-icon-btn danger"
								onclick={() => deleteMember(member.id)}
								aria-label="Delete entry"
							>
								<i class="fa-solid fa-trash"></i>
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
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
				<div class="form-section">
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

				<div class="form-row">
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

				<div class="form-section">
					<span class="mono-label">UNIT_ASSIGNMENT</span>
					<div class="input-field">
						<input
							type="text"
							bind:value={formData.team}
							placeholder="e.g. Trainee / Team BIII"
						/>
					</div>
				</div>

				<div class="form-section">
					<span class="mono-label">VISUAL_ASSET</span>
					<div class="input-field with-preview">
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

				<div class="form-section">
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

				<footer class="form-footer">
					<button
						type="button"
						class="button-pill-outline"
						onclick={() => (showModal = false)}
					>
						Discard
					</button>
					<button type="submit" class="button-pill-outline">
						{editingMember ? "Commit Changes" : "Create Record"}
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

	.header-actions {
		margin-top: 48px;
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

	.filter-group {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.search-box {
		background: var(--co-stone);
		border-radius: var(--radius-sm);
		padding: 10px 20px;
		display: flex;
		align-items: center;
		gap: 12px;
		border: 1px solid var(--co-hairline);
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

	.filter-pills {
		display: flex;
		gap: 8px;
	}

	.technical-select select {
		padding: 12px 24px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--co-hairline);
		background: var(--co-stone);
		font-family: var(--font-body);
		font-size: 14px;
		outline: none;
		cursor: pointer;
	}

	:global(.dark) .technical-select select {
		background: var(--co-bs-gray-100) !important;
		color: var(--co-bs-gray-900) !important;
	}

	/* Editorial List (Column) */

	.member-node {
		display: flex;
		flex-direction: row;
		gap: 16px;
		animation: fade-in 0.8s ease-out;
		border-radius: var(--radius-lg);
		overflow: hidden;
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
		object-position: top;
	}

	.media-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 48px;
		font-family: var(--font-display);
		background: var(--co-slate-muted);
		color: white;
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
		background: var(--co-black);
		color: var(--co-white);
	}

	.node-status.active {
		background: #008a5d;
	}

	.node-status.graduated {
		background: var(--co-slate-muted);
	}

	.node-details {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 3px;
		max-width: 600px;
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
		font-size: 32px;
		line-height: 1.1;
		margin: 0;
	}

	.node-sub {
		display: flex;
		gap: 8px;
	}

	.technical-tag {
		font-family: var(--font-mono);
		font-size: 11px;
		padding: 4px 10px;
		border: 1px solid var(--co-hairline);
		border-radius: 4px;
		background: var(--co-stone);
		color: var(--co-ink);
	}

	.node-ops {
		margin-top: 8px;
	}

	.ops-left {
		display: flex;
		gap: 8px;
	}

	.action-icon-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: transparent;
		border: 1px solid var(--co-hairline);
		color: var(--co-slate-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.action-icon-btn:hover {
		background: var(--co-ink);
		color: var(--co-white);
		border-color: var(--co-ink);
	}

	.action-icon-btn.danger:hover {
		background: var(--co-coral);
		border-color: var(--co-coral);
	}

	/* Form Card Styles (keep existing) */
	.record-form-card {
		width: 100%;
		max-width: 600px;
		background: var(--co-white);
		border-radius: var(--radius-lg);
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.2);
		overflow: scroll;
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

	.input-field label {
		font-size: 13px;
		font-weight: 500;
		color: var(--co-slate-muted);
	}

	.input-field input,
	.input-field select {
		padding: 14px 20px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--co-hairline);
		background: var(--co-stone);
		font-family: var(--font-body);
		font-size: 15px;
		width: 100%;
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

	@media (max-width: 768px) {
		.hero-display {
			font-size: 48px;
		}
		.technical-filter-bar {
			gap: 16px;
		}
		.form-row {
			flex-direction: column;
			gap: 32px;
		}
	}
</style>
