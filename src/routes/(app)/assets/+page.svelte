<script lang="ts">
	import { untrack, onMount } from "svelte";
	import { toasts } from "$lib/toasts";

	let itemsPerPage = 120;
	let assetType = $state<"product" | "group">("product");
	let sortOrder = $state<"asc" | "desc">("desc");
	interface Asset {
		id: string;
		url: string;
	}

	let assets = $state<Asset[]>([]);
	let loading = $state(false);
	let scanningStatus = $state("");
	let currentCursor = $state<number | null>(null);

	// FIX: plain (non-reactive) flag ที่ set ทันทีแบบ sync ก่อน await
	// ใช้แทนการ check `loading` ($state) ซึ่ง Svelte 5 ยังไม่ commit ก่อน effect รอบถัดไปจะ run
	let _fetchInFlight = false;

	// เช็คว่าไฟล์รูปมีอยู่จริงไหม (HEAD request)
	async function assetExists(url: string): Promise<boolean> {
		try {
			const res = await fetch(url, { method: "HEAD" });
			return res.ok;
		} catch {
			return false;
		}
	}

	// Server จัดการ SKU ให้แล้ว (ผ่าน API)

	async function loadNextBatch() {
		if (_fetchInFlight) return;
		_fetchInFlight = true;
		loading = true;

		let start: number;
		if (sortOrder === "asc") {
			start = currentCursor ?? 0;
		} else {
			// สำหรับ desc: start คือจุดสูงสุดที่ยังไม่ได้โหลด
			start = currentCursor ?? 0;
		}

		const rangeEnd =
			sortOrder === "asc"
				? start + itemsPerPage - 1
				: Math.max(0, start - itemsPerPage + 1);
		scanningStatus =
			sortOrder === "asc"
				? `กำลังโหลด ID ${start}–${start + itemsPerPage - 1} ...`
				: `กำลังโหลด ID ${start}–${rangeEnd} (ใหม่ไปเก่า) ...`;

		try {
			const resp = await fetch(
				`/api/check-assets?start=${start}&count=${itemsPerPage}&type=${assetType}&order=${sortOrder}`,
			);
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const newAssets: Asset[] = await resp.json();

			if (newAssets.length === 0) {
				scanningStatus = `ไม่พบ asset ในช่วงนี้ ลองเปลี่ยนประเภทหรือลำดับ`;
			} else {
				assets = [...assets, ...newAssets];

				if (sortOrder === "asc") {
					currentCursor = start + itemsPerPage;
				} else {
					// หา ID ที่เล็กที่สุดในรอบนี้ แล้วลบ 1 เพื่อใช้เป็นจุดเริ่มรอบถัดไป
					const smallestNewId = Math.min(
						...newAssets.map((a) => parseInt(a.id)),
					);
					currentCursor = smallestNewId - 1;
				}
				scanningStatus = ""; // Clear status when done
			}
		} catch (error) {
			console.error(error);
			scanningStatus = "เกิดข้อผิดพลาดในการโหลด";
			setTimeout(() => (scanningStatus = ""), 3000);
			toasts.add("เกิดข้อผิดพลาดในการโหลด", "error");
		} finally {
			_fetchInFlight = false;
			loading = false;
		}
	}

	// อัลกอริทึมค้นหา ID ล่าสุด (ลอง API ก่อน ถ้าไม่ได้ใช้ Adaptive Step)
	async function findLatestAdaptive() {
		if (_fetchInFlight) return;
		_fetchInFlight = true;
		loading = true;
		assets = [];
		scanningStatus = "กำลังหา ID ล่าสุด...";

		try {
			// ใช้ Server API แบบ Binary Search (เร็วที่สุดและแก้ปัญหา Timeout แล้ว)
			const apiResp = await fetch(
				`/api/check-assets/latest?type=${assetType}`,
			);
			if (apiResp.ok) {
				const latest = await apiResp.json();
				if (
					latest &&
					latest.id &&
					latest.id !== "0" &&
					latest.id !== "0000"
				) {
					const latestId = parseInt(latest.id);
					scanningStatus = `พบ ID ล่าสุด = ${latestId}`;
					if (sortOrder !== "desc") sortOrder = "desc";
					currentCursor = latestId;
					_fetchInFlight = false; // release ก่อน loadNextBatch
					await loadNextBatch();
					return;
				}
			}

			scanningStatus = "ไม่พบ asset เลย หรือเกิดข้อผิดพลาดจาก Server";
		} catch (err) {
			console.error(err);
			scanningStatus = "เกิดข้อผิดพลาด";
			toasts.add("ค้นหาล่าสุดไม่สำเร็จ", "error");
		} finally {
			_fetchInFlight = false;
			loading = false;
		}
	}

	function resetAndLoad() {
		assets = [];
		if (sortOrder === "asc") {
			// Start from the beginning to catch new low-ID assets
			currentCursor = 0;
			loadNextBatch();
		} else {
			currentCursor = null;
			// ถ้าเลือก "ใหม่สุดก่อน" ให้สแกนหาตัวล่าสุดอัตโนมัติ
			findLatestAdaptive();
		}
	}

	function clearResults() {
		assets = [];
		scanningStatus = "ล้างรายการแล้ว";
		currentCursor = sortOrder === "asc" ? 0 : null;
	}

	function copyAllUrls() {
		if (assets.length === 0) {
			toasts.add("ไม่มีรายการให้คัดลอก", "warning");
			return;
		}
		// URLs are already proxied from the API
		const urls = assets.map((a) => a.url).join("\n");
		navigator.clipboard.writeText(urls);
		toasts.add(`คัดลอก ${assets.length} Internal URI แล้ว`, "success");
	}

	// ใช้ onMount แทน $effect สำหรับ initial load
	// เพื่อป้องกัน double-call ระหว่าง SSR hydration
	let _mounted = false;

	// Cache สำหรับเก็บ SKU ที่เคยโหลดแล้ว
	let skuCache = new Map<string, string[]>();

	async function openGallery(asset: Asset) {
		selectedAsset = asset;
		modalMainUrl = asset.url;
		modalSkus = [];
		if (assetType !== "product") {
			return;
		}

		modalLoadingSkus = true;
		try {
			// เช็ค Cache ก่อน
			if (skuCache.has(asset.id)) {
				modalSkus = skuCache.get(asset.id)!;
				modalLoadingSkus = false;
				return;
			}

			// ดึง skus array จาก DB ผ่าน sku endpoint
			const resp = await fetch(
				`/api/assets/scan/status/sku?id=${asset.id}&type=product`,
			);
			if (resp.ok) {
				const data = await resp.json();
				if (
					data?.skus &&
					Array.isArray(data.skus) &&
					data.skus.length > 1
				) {
					// skus เป็น array ของตัวเลข เช่น [1, 2, 3]
					// ต้องแปลงเป็น URL โดยดู format จาก asset.url ของ sku-1 แล้วแทนที่เลข
					const baseUrl = asset.url; // เช่น /p/img/shop/product/1009/sku-1.jpg
					const skuUrls: string[] = [];
					for (const sku of data.skus) {
						if (sku === 1) continue; // sku-1 คือ thumbnail อยู่แล้ว
						// แทนที่ตัวเลขท้าย URL เช่น sku-1.jpg → sku-2.jpg
						const skuUrl = baseUrl.replace(
							/(sku-)(\d+)(\.\w+)$/,
							`$1${sku}$3`,
						);
						if (skuUrl !== baseUrl) {
							skuUrls.push(skuUrl);
						}
					}
					modalSkus = skuUrls;
					skuCache.set(asset.id, modalSkus);
				}
			}
		} catch (err) {
			console.error("Failed to load SKUs:", err);
		} finally {
			modalLoadingSkus = false;
		}
	}

	function closeGallery() {
		selectedAsset = null;
	}

	function navigateGallery(direction: "prev" | "next") {
		if (!selectedAsset) return;
		const currentIndex = assets.findIndex(
			(a) => a.id === selectedAsset!.id,
		);
		if (currentIndex === -1) return;

		let nextIndex = currentIndex + (direction === "next" ? 1 : -1);
		if (nextIndex >= 0 && nextIndex < assets.length) {
			openGallery(assets[nextIndex]);
		}
	}

	onMount(() => {
		_mounted = true;

		// อ่านค่าจาก URL params
		const params = new URLSearchParams(window.location.search);
		const typeParam = params.get("type");
		const jumpParam = params.get("jump");

		if (typeParam === "product" || typeParam === "group") {
			assetType = typeParam;
		}

		if (jumpParam) {
			jumpToId = jumpParam;
			// ถ้ามี jump ให้ทำงาน jumpTo เลย
			assets = [];
			currentCursor = parseInt(jumpParam);
			loadNextBatch();
			scanningStatus = `🚀 กระโดดไปที่ ID ${jumpParam} ...`;
		} else {
			resetAndLoad();
		}
	});

	$effect(() => {
		const _type = assetType;
		const _order = sortOrder;
		// ไม่ทำงานตอน mount ครั้งแรก (onMount จัดการแล้ว)
		if (!_mounted) return;
		untrack(() => resetAndLoad());
	});

	let jumpToId = $state("");

	function jumpTo() {
		const idNum = parseInt(jumpToId);
		if (isNaN(idNum) || idNum < 0) {
			toasts.add("กรุณากรอก ID ที่ถูกต้อง", "warning");
			return;
		}
		assets = [];
		currentCursor = idNum;
		loadNextBatch();
		scanningStatus = `🚀 กระโดดไปที่ ID ${idNum} ...`;
	}

	const loadMoreLabel = () =>
		sortOrder === "asc" ? "โหลดเพิ่ม (รุ่นเก่า)" : "โหลดรุ่นเก่าต่อ";

	let selectedAsset = $state<Asset | null>(null);
	let modalSkus = $state<string[]>([]);
	let modalLoadingSkus = $state(false);
	let modalMainUrl = $state("");
</script>

<div class="page-shell">
	<header class="page-header page-header--split">
		<div class="header-left">
			<span class="mono-label">Visual Infrastructure</span>
			<h1 class="hero-display">Asset Registry</h1>
			<p class="body-large">
				Technical repository for indexing and discovering official
				imagery assets and product media.
			</p>
		</div>

		<div class="technical-filter-bar">
			<div class="filter-pills">
				<button
					class="button-pill-outline"
					onclick={() => (assetType = "product")}
					class:active={assetType === "product"}
				>
					Products
				</button>
				<button
					class="button-pill-outline"
					onclick={() => (assetType = "group")}
					class:active={assetType === "group"}
				>
					Collectives
				</button>
			</div>

			<div class="technical-select">
				<select bind:value={sortOrder}>
					<option value="desc">Latest Archives</option>
					<option value="asc">Historical First</option>
				</select>
			</div>

			<div class="search-box jump-box">
				<input
					type="number"
					placeholder="Jump to Node ID"
					bind:value={jumpToId}
				/>
			</div>

			<button
				class="button-pill-outline"
				onclick={findLatestAdaptive}
				disabled={loading}
			>
				Find Latest
			</button>
		</div>
	</header>

	{#if loading || (scanningStatus && !scanningStatus.includes("เสร็จ"))}
		<div class="status-stream">
			<div class="status-node mb-4">
				{#if loading}
					<i class="fa-solid fa-spinner fa-spin me-2"></i>
				{:else}
					<i class="fa-solid fa-circle-notch fa-spin me-2 opacity-50"
					></i>
				{/if}
				<span class="mono-label">{scanningStatus}</span>
			</div>
		</div>
	{/if}

	<div class="asset-grid">
		{#each assets as asset (asset.id)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="editorial-card"
				onclick={() => openGallery(asset)}
				role="button"
				tabindex="0"
			>
				<div class="media-wrap">
					<img
						src={asset.url}
						alt={asset.id}
						loading="lazy"
						onerror={(e) => {
							const img = e.currentTarget as HTMLImageElement;
							img.style.opacity = "0.15";
							img.closest(".editorial-card")?.setAttribute(
								"data-broken",
								"true",
							);
						}}
					/>
					<div class="node-id">#{asset.id}</div>
				</div>
				<div class="card-overlay">
					<i class="fa-solid fa-expand"></i>
				</div>
			</div>
		{/each}
	</div>

	<div class="pagination-footer">
		<button
			class="button-pill-outline px-5"
			onclick={loadNextBatch}
			disabled={loading}
		>
			{loadMoreLabel()}
		</button>
	</div>
</div>

{#if selectedAsset}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="gallery-overlay" onclick={closeGallery} role="presentation">
		<button
			class="close-trigger"
			onclick={closeGallery}
			aria-label="Close window"
		>
			<i class="fa-solid fa-xmark"></i>
		</button>

		<div class="navigation-controls">
			<button
				class="nav-trigger"
				onclick={(e) => {
					e.stopPropagation();
					navigateGallery("prev");
				}}
				disabled={assets.findIndex(
					(a) => a.id === selectedAsset!.id,
				) === 0}
				aria-label="Previous Asset"
			>
				<i class="fa-solid fa-arrow-left"></i>
			</button>
			<button
				class="nav-trigger"
				onclick={(e) => {
					e.stopPropagation();
					navigateGallery("next");
				}}
				disabled={assets.findIndex(
					(a) => a.id === selectedAsset!.id,
				) ===
					assets.length - 1}
				aria-label="Next Asset"
			>
				<i class="fa-solid fa-arrow-right"></i>
			</button>
		</div>

		<div
			class="gallery-module"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="viewer-core">
				<div class="">
					<img
						src={modalMainUrl}
						alt="Gallery view"
						class="viewer-img"
					/>
					{#if modalSkus.length > 0 || modalLoadingSkus}
						<div class="inventory-strip">
							<button
								class="inventory-thumb {modalMainUrl ===
								selectedAsset.url
									? 'active'
									: ''}"
								onclick={() =>
									(modalMainUrl = selectedAsset!.url)}
							>
								<img src={selectedAsset.url} alt="Base" />
							</button>
							{#each modalSkus as skuUrl}
								<button
									class="inventory-thumb {modalMainUrl ===
									skuUrl
										? 'active'
										: ''}"
									onclick={() => (modalMainUrl = skuUrl)}
								>
									<img src={skuUrl} alt="Variant" />
								</button>
							{/each}
							{#if modalLoadingSkus}
								<div class="inventory-loader">
									<i class="fa-solid fa-spinner fa-spin"></i>
								</div>
							{/if}
						</div>
					{/if}
				</div>
				<div class="viewer-meta">
					<div class="meta-left">
						<span class="mono-label"
							>{assetType.toUpperCase()}_NODE</span
						>
						<h3 class="technical-title">ID: {selectedAsset.id}</h3>
					</div>
					<div class="meta-right">
						<button
							class="button-pill-outline"
							onclick={() => {
								navigator.clipboard.writeText(modalMainUrl);
								toasts.add(
									"Copied URL to clipboard",
									"success",
								);
							}}
						>
							<i class="fa-solid fa-link me-2"></i> Copy URI
						</button>
						<button
							class="button-pill-outline"
							onclick={() => {
								window.open(modalMainUrl, "_blank");
							}}
						>
							View Full Asset <i class="fa-solid fa-expand ms-2"
							></i>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media (max-width: 768px) {
		.filter-pills {
			justify-content: space-between;
		}
		.filter-pills button {
			flex: 1;
		}
	}

	/* Asset Grid */
	.asset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 24px;
	}

	@media (max-width: 640px) {
		.asset-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: 16px;
		}
	}

	.editorial-card {
		aspect-ratio: 1/1;
		background: var(--co-stone);
		border-radius: var(--radius-lg);
		position: relative;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
		border: 1px solid var(--co-hairline);
	}

	.editorial-card:hover {
		border-color: var(--co-blue);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
	}

	.media-wrap {
		width: 100%;
		height: 100%;
	}

	.media-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.editorial-card:hover .media-wrap img {
		transform: scale(1.08);
	}

	.node-id {
		position: absolute;
		top: 16px;
		left: 16px;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		color: #ffffff;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 4px;
		z-index: 2;
	}

	.card-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
		opacity: 0;
		transition: opacity 0.3s;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		font-size: 24px;
	}

	.editorial-card:hover .card-overlay {
		opacity: 1;
	}

	.pagination-footer {
		padding: 100px 0;
		display: flex;
		justify-content: center;
	}

	/* Gallery Overlay */
	.gallery-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(20px);
		z-index: 3000;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px;
	}

	.close-trigger {
		position: absolute;
		top: 40px;
		right: 40px;
		background: none;
		border: none;
		color: white;
		font-size: 32px;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.close-trigger:hover {
		opacity: 1;
	}

	.navigation-controls {
		position: absolute;
		width: 100%;
		padding: 0 40px;
		display: flex;
		justify-content: space-between;
		pointer-events: none;
	}

	.nav-trigger {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: white;
		cursor: pointer;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		transition: all 0.2s;
	}

	.nav-trigger:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.1);
	}

	.nav-trigger:disabled {
		opacity: 0.2;
		cursor: default;
	}

	.gallery-module {
		display: flex;
		flex-direction: column;
		animation: scale-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	@keyframes scale-up {
		from {
			transform: scale(0.9);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.viewer-core {
		width: 100%;
		background: var(--co-black);
		border-radius: var(--radius-lg);
		overflow: hidden;
		display: flex;
		justify-content: center;
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
	}

	.viewer-img {
		max-height: 70vh;
		object-fit: contain;
	}

	@media (max-width: 900px) {
		.viewer-core {
			flex-direction: column;
		}
		.viewer-img {
			padding: 20px;
		}
	}

	.inventory-strip {
		display: flex;
		gap: 12px;
		justify-content: center;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--radius-md);
	}

	.inventory-thumb {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 2px solid transparent;
		background: none;
		padding: 0;
		cursor: pointer;
		transition: all 0.2s;
		opacity: 0.5;
	}

	.inventory-thumb.active {
		border-color: var(--co-white);
		opacity: 1;
		transform: scale(1.1);
	}

	.inventory-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.inventory-loader {
		display: flex;
		align-items: center;
		padding: 0 12px;
		color: white;
	}

	.viewer-meta {
		background: var(--co-white);
		padding: 40px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 320px;
	}

	@media (max-width: 900px) {
		.viewer-meta {
			min-width: 0;
			padding: 32px;
		}
	}

	.meta-left .technical-title {
		font-size: 28px;
		margin-top: 8px;
		color: var(--co-black);
	}

	.meta-right {
		display: flex;
		gap: 16px;
	}

	@media (max-width: 768px) {
		.gallery-overlay {
			padding: 20px;
		}
		.viewer-meta {
			flex-direction: column;
			gap: 24px;
			align-items: flex-start;
			padding: 24px;
		}
		.meta-right {
			width: 100%;
		}
		.meta-right button {
			flex: 1;
		}
	}
</style>
