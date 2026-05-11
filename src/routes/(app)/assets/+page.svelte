<script lang="ts">
	import { untrack, onMount, tick } from "svelte";
	import { toasts } from "$lib/toasts";
	import {
		getRoundOnlyThumbnailCandidates,
		getSatSunSwingThumbnailCandidates,
		isKnownProductAssetRange,
		isProductRoundOnlyZone,
		isProductSatSunSwingZone,
	} from "$lib/bnk48";

	let itemsPerPage = 250;
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

	let _fetchInFlight = false;

	async function loadNextBatch() {
		if (_fetchInFlight) return;
		_fetchInFlight = true;
		loading = true;

		let start: number;
		if (sortOrder === "asc") {
			start = currentCursor ?? 1;
		} else {
			if (currentCursor === null) {
				try {
					const apiResp = await fetch(
						`/api/check-assets/latest?type=${assetType}`,
					);
					if (apiResp.ok) {
						const latest = await apiResp.json();
						if (
							latest?.id &&
							latest.id !== "0" &&
							latest.id !== "0000"
						) {
							currentCursor = parseInt(latest.id, 10);
						}
					}
				} catch {
					/* fall through */
				}
				if (currentCursor === null) {
					_fetchInFlight = false;
					loading = false;
					scanningStatus =
						"โหมดใหม่สุดต้องรู้ ID ล่าสุดก่อน — กด Find Latest หรือสลับลำดับ";
					toasts.add(
						"ไม่ทราบ ID ล่าสุดสำหรับโหมดนี้ กด Find Latest",
						"warning",
					);
					return;
				}
			}
			start = currentCursor;
		}

		const rangeEnd =
			sortOrder === "asc"
				? start + itemsPerPage - 1
				: Math.max(1, start - itemsPerPage + 1);
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
					const smallestNewId = Math.min(
						...newAssets.map((a) => parseInt(a.id)),
					);
					currentCursor = smallestNewId - 1;
				}
				scanningStatus = "";
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

	async function findLatestAdaptive() {
		if (_fetchInFlight) return;
		_fetchInFlight = true;
		loading = true;
		assets = [];
		scanningStatus = "กำลังหา ID ล่าสุด...";

		try {
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
					_fetchInFlight = false;
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
			currentCursor = 1;
			loadNextBatch();
		} else {
			currentCursor = null;
			findLatestAdaptive();
		}
	}

	function clearResults() {
		assets = [];
		scanningStatus = "ล้างรายการแล้ว";
		currentCursor = sortOrder === "asc" ? 1 : null;
	}

	function assetResolvedOrApiUrl(asset: Asset): string {
		if (assetType !== "product") return asset.url;
		return resolvedThumbByProductId.get(asset.id) ?? asset.url;
	}

	function copyAllUrls() {
		if (assets.length === 0) {
			toasts.add("ไม่มีรายการให้คัดลอก", "warning");
			return;
		}
		const urls = assets.map((a) => assetResolvedOrApiUrl(a)).join("\n");
		navigator.clipboard.writeText(urls);
		toasts.add(`คัดลอก ${assets.length} Internal URI แล้ว`, "success");
	}

	let mounted = $state(false);
	let skipResetOnce = $state(false);
	let skuCache = new Map<string, string[]>();
	let resolvedThumbByProductId = new Map<string, string>();

	function normalizeAssetPath(src: string): string {
		try {
			const u = new URL(
				src,
				typeof window !== "undefined"
					? window.location.href
					: "http://localhost",
			);
			return u.pathname.replace(/\/$/, "");
		} catch {
			return src.split("?")[0].replace(/\/$/, "");
		}
	}

	function pathsMatch(a: string, b: string): boolean {
		const na = normalizeAssetPath(a);
		const nb = normalizeAssetPath(b);
		return na === nb || na.endsWith(nb) || nb.endsWith(na);
	}

	function findCandidateIndex(
		candidates: string[],
		resolvedSrc: string,
	): number {
		const path = normalizeAssetPath(resolvedSrc);
		for (let i = 0; i < candidates.length; i++) {
			if (pathsMatch(path, candidates[i])) return i;
		}
		return 0;
	}

	function recordResolvedProductThumb(assetId: string, imgSrc: string) {
		if (assetType !== "product") return;
		const path = normalizeAssetPath(imgSrc);
		if (!path.includes("/shop/product/")) return;
		resolvedThumbByProductId.set(assetId, path);
	}

	function productThumbCandidates(assetId: string): string[] | null {
		const id = parseInt(assetId, 10);
		if (!Number.isFinite(id)) return null;
		if (isProductSatSunSwingZone(id))
			return getSatSunSwingThumbnailCandidates(assetId);
		if (isProductRoundOnlyZone(id))
			return getRoundOnlyThumbnailCandidates(assetId);
		return null;
	}

	function buildSkuUrlsFromBase(baseUrl: string, skus: number[]): string[] {
		const out: string[] = [];
		const seen = new Set<string>();
		const baseMatch = baseUrl.match(
			/(image-|cherprang-1-|cherprang-1|CGM48-Debut-|bnk48-|cgm48-|Janken-2023-0|CGM48-Sansei-Kawaii-|tshirt-|Round|sku-?)(\d+)(\.\w+)$/i,
		);
		if (!baseMatch) return out;

		const [, prefix, , ext] = baseMatch;
		const push = (u: string) => {
			if (seen.has(u)) return;
			seen.add(u);
			out.push(u);
		};

		for (const sku of skus) {
			if (sku === 1) continue;
			const candidates: string[] = [];

			if (/^sku-?$/i.test(prefix)) {
				candidates.push(
					baseUrl.replace(/(sku-?)(\d+)(\.\w+)$/i, `sku-${sku}$3`),
				);
				candidates.push(
					baseUrl.replace(/(sku-?)(\d+)(\.\w+)$/i, `sku${sku}$3`),
				);
			} else {
				candidates.push(
					baseUrl.replace(
						/(image-|cherprang-1-|cherprang-1|CGM48-Debut-|bnk48-|cgm48-|Janken-2023-0|CGM48-Sansei-Kawaii-|tshirt-|Round|sku-?)(\d+)(\.\w+)$/i,
						`${prefix}${sku}$3`,
					),
				);
			}

			if (ext.toLowerCase() === ".jpg") {
				candidates.push(
					...candidates.map((u) => u.replace(/\.jpg$/i, ".png")),
				);
			} else if (ext.toLowerCase() === ".png") {
				candidates.push(
					...candidates.map((u) => u.replace(/\.png$/i, ".jpg")),
				);
			}

			for (const candidate of candidates) push(candidate);
		}

		return out;
	}

	function isSkuVariantUrl(url: string): boolean {
		try {
			const p = normalizeAssetPath(url).toLowerCase();
			return /\/sku-?\d+\.(jpg|png|webp)$/i.test(p);
		} catch {
			return false;
		}
	}

	function extractSkuNumber(url: string): number | null {
		const p = normalizeAssetPath(url).toLowerCase();
		const m = p.match(
			/(?:image-|cherprang-1-|cherprang-1|CGM48-Debut-|bnk48-|cgm48-|Janken-2023-0|CGM48-Sansei-Kawaii-|tshirt-|Round|sku-?)(\d+)\.(?:jpg|png|webp)$/i,
		);
		if (!m) return null;
		const n = Number.parseInt(m[1], 10);
		return Number.isFinite(n) ? n : null;
	}

	/** Keep only one URL per SKU number (2,3,4,...) */
	function compactSkuUrls(urls: string[]): string[] {
		const out: string[] = [];
		const seenSku = new Set<number>();
		for (const u of urls) {
			if (!isSkuVariantUrl(u)) continue;
			const skuNo = extractSkuNumber(u);
			if (skuNo === null || skuNo <= 1) continue;
			if (seenSku.has(skuNo)) continue;
			seenSku.add(skuNo);
			out.push(u);
		}
		return out;
	}

	// ── Modal / Carousel state ────────────────────────────────────────────────
	let selectedAsset = $state<Asset | null>(null);
	let modalSkus = $state<string[]>([]);
	let modalLoadingSkus = $state(false);
	let modalMainUrl = $state("");
	let modalSwingIdx = $state(0);

	/** Index ปัจจุบันของ carousel */
	let carouselIdx = $state(0);
	let carouselTrackEl = $state<HTMLDivElement | null>(null);
	let carouselScrollRaf = 0;

	let discoveredUrls = $state<string[]>([]);

	/**
	 * รวม primary URL + discovered URLs เป็น slides
	 * จะเริ่มจาก 1 (รูปหลัก) แล้วค่อยๆ เพิ่มถ้าโหลดรูปอื่นเจอ
	 */
	let carouselSlides = $derived.by((): string[] => {
		if (!selectedAsset) return [];
		const primary = modalPrimaryUrl(selectedAsset);

		// เอาเฉพาะที่โหลดสำเร็จแล้ว และไม่ซ้ำกับ primary
		const extras = discoveredUrls.filter((u) => !pathsMatch(u, primary));
		const slides = [primary, ...extras];

		// เรียงลำดับจากน้อยไปมาก (ตามเลข SKU/Round)
		slides.sort((a, b) => {
			const numA = extractSkuNumber(a) ?? 1;
			const numB = extractSkuNumber(b) ?? 1;
			return numA - numB;
		});

		return slides;
	});

	let preloadedSlideUrls = $state(new Set<string>());

	function preloadCarouselSlides(urls: string[]) {
		for (const slideUrl of urls) {
			if (!slideUrl || preloadedSlideUrls.has(slideUrl)) continue;
			preloadedSlideUrls.add(slideUrl);
			const img = new Image();
			img.decoding = "async";
			img.onload = () => {
				// ถ้าโหลดสำเร็จ ให้เพิ่มเข้า discovered
				if (!discoveredUrls.includes(slideUrl)) {
					discoveredUrls = [...discoveredUrls, slideUrl];
				}
			};
			img.src = slideUrl;
		}
	}

	$effect(() => {
		if (!selectedAsset) return;
		// โหลดทั้งรูปหลักและรูปที่คาดการณ์ไว้
		const candidates = [modalPrimaryUrl(selectedAsset), ...modalSkus];
		preloadCarouselSlides(candidates);
	});

	async function syncCarouselScrollPosition() {
		await tick();
		if (!carouselTrackEl || carouselSlides.length === 0) return;
		const w = carouselTrackEl.clientWidth;
		if (w <= 0) return;
		carouselTrackEl.scrollLeft = carouselIdx * w;
	}

	function handleCarouselScroll() {
		cancelAnimationFrame(carouselScrollRaf);
		carouselScrollRaf = requestAnimationFrame(() => {
			if (!carouselTrackEl || carouselSlides.length === 0) return;
			const w = carouselTrackEl.clientWidth;
			if (w <= 0) return;
			const idx = Math.round(carouselTrackEl.scrollLeft / w);
			const next = Math.max(0, Math.min(carouselSlides.length - 1, idx));
			if (next !== carouselIdx) {
				carouselIdx = next;
				if (carouselSlides[next]) modalMainUrl = carouselSlides[next];
			}
		});
	}

	function scrollCarouselToIndex(
		i: number,
		behavior: ScrollBehavior = "smooth",
	) {
		void tick().then(() => {
			if (!carouselTrackEl) return;
			const w = carouselTrackEl.clientWidth;
			carouselTrackEl.scrollTo({ left: i * w, behavior });
		});
	}

	function goCarousel(direction: "prev" | "next") {
		const len = carouselSlides.length;
		if (len === 0) return;
		const next =
			direction === "prev"
				? Math.max(0, carouselIdx - 1)
				: Math.min(len - 1, carouselIdx + 1);
		carouselIdx = next;
		if (carouselSlides[next]) modalMainUrl = carouselSlides[next];
		scrollCarouselToIndex(next, "smooth");
	}

	async function openGallery(asset: Asset) {
		selectedAsset = asset;
		carouselIdx = 0;
		discoveredUrls = [];
		preloadedSlideUrls = new Set();

		const c =
			assetType === "product" ? productThumbCandidates(asset.id) : null;
		const resolved = resolvedThumbByProductId.get(asset.id);

		if (assetType === "product" && resolved) {
			modalMainUrl = resolved;
			modalSwingIdx = c ? findCandidateIndex(c, resolved) : 0;
		} else if (assetType === "product" && c) {
			modalSwingIdx = 0;
			modalMainUrl = c[0] ?? asset.url;
		} else {
			modalSwingIdx = 0;
			modalMainUrl = asset.url;
		}

		modalSkus = [];
		if (assetType !== "product") {
			await syncCarouselScrollPosition();
			return;
		}

		modalLoadingSkus = true;
		try {
			if (skuCache.has(asset.id)) {
				modalSkus = compactSkuUrls(skuCache.get(asset.id)!);
			} else {
				const baseUrl = modalPrimaryUrl(asset) || asset.url;

				const resp = await fetch(
					`/api/assets/scan/status/sku?id=${asset.id}&type=product`,
				);
				if (resp.ok) {
					const data = await resp.json();
					const skuUrls: string[] = [];
					const seen = new Set<string>();

					const pushSkuUrl = (u: string, force = false) => {
						if (!force && !isSkuVariantUrl(u)) return;
						if (
							pathsMatch(u, modalMainUrl) ||
							pathsMatch(u, asset.url)
						)
							return;
						if (seen.has(u)) return;
						seen.add(u);
						skuUrls.push(u);
					};

					if (data?.urls && Array.isArray(data.urls)) {
						for (const u of data.urls) pushSkuUrl(u, true);
					}

					const explicitSkus: number[] =
						data?.skus && Array.isArray(data.skus)
							? data.skus.filter((n: unknown) =>
									Number.isFinite(n as number),
								)
							: [];

					const guessSkus = explicitSkus.some((n) => n > 1)
						? explicitSkus
						: [2, 3, 4, 5, 6, 7, 8];
					for (const skuUrl of buildSkuUrlsFromBase(
						baseUrl,
						guessSkus,
					))
						pushSkuUrl(skuUrl);

					modalSkus = compactSkuUrls(skuUrls);
					skuCache.set(asset.id, modalSkus);
				} else {
					modalSkus = compactSkuUrls(
						buildSkuUrlsFromBase(
							baseUrl,
							[2, 3, 4, 5, 6, 7, 8],
						).filter(
							(u) =>
								!pathsMatch(u, modalMainUrl) &&
								!pathsMatch(u, asset.url),
						),
					);
					skuCache.set(asset.id, modalSkus);
				}
			}
		} catch (err) {
			console.error("Failed to load SKUs:", err);
			const baseUrl = modalPrimaryUrl(asset) || asset.url;
			modalSkus = compactSkuUrls(
				buildSkuUrlsFromBase(baseUrl, [2, 3, 4, 5, 6, 7, 8]).filter(
					(u) =>
						!pathsMatch(u, modalMainUrl) &&
						!pathsMatch(u, asset.url),
				),
			);
			skuCache.set(asset.id, modalSkus);
		} finally {
			modalLoadingSkus = false;
		}
		await syncCarouselScrollPosition();
	}

	function closeGallery() {
		selectedAsset = null;
		carouselIdx = 0;
		modalSkus = [];
	}

	function navigateGallery(direction: "prev" | "next") {
		if (!selectedAsset) return;
		const currentIndex = assets.findIndex(
			(a) => a.id === selectedAsset!.id,
		);
		if (currentIndex === -1) return;
		const nextIndex = currentIndex + (direction === "next" ? 1 : -1);
		if (nextIndex >= 0 && nextIndex < assets.length) {
			openGallery(assets[nextIndex]);
		}
	}

	// keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (!selectedAsset) return;
		if (e.key === "Escape") closeGallery();
		if (e.key === "ArrowLeft") {
			// shift+left = prev asset, left alone = prev slide
			if (e.shiftKey) navigateGallery("prev");
			else goCarousel("prev");
		}
		if (e.key === "ArrowRight") {
			if (e.shiftKey) navigateGallery("next");
			else goCarousel("next");
		}
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	});

	function assetThumbSrc(asset: Asset): string {
		if (assetType !== "product") return asset.url;
		const c = productThumbCandidates(asset.id);
		if (c) return c[0] ?? asset.url;
		return asset.url;
	}

	function modalBaseUrl(asset: Asset): string {
		if (assetType !== "product") return asset.url;
		const c = productThumbCandidates(asset.id);
		if (c) return c[0] ?? asset.url;
		return asset.url;
	}

	function modalPrimaryUrl(asset: Asset): string {
		if (assetType !== "product") return asset.url;
		const resolved = resolvedThumbByProductId.get(asset.id);
		if (resolved) return resolved;
		return modalBaseUrl(asset);
	}

	function handleAssetThumbError(e: Event, asset: Asset) {
		const img = e.currentTarget as HTMLImageElement;
		const candidates =
			assetType === "product" ? productThumbCandidates(asset.id) : null;
		const normalizedSrc = normalizeAssetPath(img.src).toLowerCase();
		const isSku1Source =
			normalizedSrc.endsWith("/sku-1.jpg") ||
			normalizedSrc.endsWith("/sku-1.png");

		if (
			assetType === "product" &&
			isSku1Source &&
			!isKnownProductAssetRange(asset.id)
		) {
			const card = img.closest(".editorial-card") as HTMLElement | null;
			if (card) card.style.display = "none";
			else img.style.display = "none";
			return;
		}

		if (candidates) {
			let idx = parseInt(img.dataset.swingIdx ?? "0", 10);
			idx += 1;
			if (idx < candidates.length) {
				img.dataset.swingIdx = String(idx);
				img.src = candidates[idx];
				return;
			}
			img.dataset.swingIdx = "done";
			img.style.display = "none";
			img.closest(".editorial-card")?.setAttribute("data-broken", "true");
			return;
		}

		if (img.dataset.retried === "done") {
			img.style.display = "none";
			img.closest(".editorial-card")?.setAttribute("data-broken", "true");
			return;
		}

		const src = img.src;

		if (src.includes("SAT-Round")) {
			img.src = src.replace("SAT-Round", "SUN-Round");
			img.dataset.retried = "1";
			return;
		}
		if (src.includes("SUN-Round") && img.dataset.retried === "1") {
			const roundMatch = src.match(/Round(\d+)/);
			if (roundMatch) {
				const nextRound = parseInt(roundMatch[1], 10) + 1;
				if (nextRound <= 6) {
					img.src = src.replace(
						/SAT-Round\d+|SUN-Round\d+/,
						`SAT-Round${nextRound}`,
					);
					img.dataset.retried = "2";
					return;
				}
			}
		}

		if (src.endsWith(".jpg")) {
			img.src = src.replace(".jpg", ".png");
			img.dataset.retried = "done";
			return;
		}
		if (src.endsWith(".png")) {
			img.src = src.replace(".png", ".jpg");
			img.dataset.retried = "done";
			return;
		}

		img.dataset.retried = "done";
		img.style.display = "none";
		img.closest(".editorial-card")?.setAttribute("data-broken", "true");
	}

	function handleModalSlideError(e: Event, slideUrl: string) {
		const img = e.currentTarget as HTMLImageElement;
		// ถ้าพัง ให้เอาออกจาก discovered (ถ้ามี)
		discoveredUrls = discoveredUrls.filter((u) => u !== slideUrl);
		img.style.opacity = "0.25";
	}

	function handleModalMainLoad(e: Event) {
		const asset = selectedAsset;
		if (!asset || assetType !== "product") return;
		const img = e.currentTarget as HTMLImageElement;
		recordResolvedProductThumb(asset.id, img.src);
	}

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

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const typeParam = params.get("type");
		const jumpParam = params.get("jump");

		if (typeParam === "product" || typeParam === "group") {
			assetType = typeParam;
		}

		if (jumpParam) {
			skipResetOnce = true;
			jumpToId = jumpParam;
			assets = [];
			currentCursor = parseInt(jumpParam, 10);
			loadNextBatch();
			scanningStatus = `🚀 กระโดดไปที่ ID ${jumpParam} ...`;
		}

		mounted = true;
	});

	$effect(() => {
		const _type = assetType;
		const _order = sortOrder;
		if (!mounted) return;
		if (skipResetOnce) {
			skipResetOnce = false;
			return;
		}
		untrack(() => resetAndLoad());
	});

	/** URL ที่จะ copy — ตาม slide ที่ดูอยู่ */
	function currentCopyUrl(): string {
		return carouselSlides[carouselIdx] ?? modalMainUrl;
	}

	const BUFFER = 50; // render เกิน viewport ไป 50 items ทั้งบนและล่าง
	let visibleStart = $state(0);
	let visibleEnd = $state(100);

	let gridEl: HTMLElement | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let scrollHandler: (() => void) | null = null;

	function updateVisibleRange() {
		if (!gridEl) return;
		const cards = gridEl.querySelectorAll(".editorial-card");
		if (cards.length === 0) return;

		const viewTop = window.scrollY - BUFFER * 300;
		const viewBottom = window.scrollY + window.innerHeight + BUFFER * 300;

		let start = 0;
		let end = assets.length;

		for (let i = 0; i < cards.length; i++) {
			const rect = (cards[i] as HTMLElement).getBoundingClientRect();
			const absTop = rect.top + window.scrollY;
			if (absTop < viewTop && i > start) start = i;
			if (absTop > viewBottom) {
				end = i;
				break;
			}
		}

		visibleStart = Math.max(0, start - BUFFER);
		visibleEnd = Math.min(assets.length, end + BUFFER);
	}

	onMount(() => {
		scrollHandler = () => requestAnimationFrame(updateVisibleRange);
		window.addEventListener("scroll", scrollHandler, { passive: true });

		resizeObserver = new ResizeObserver(updateVisibleRange);
		if (gridEl) resizeObserver.observe(gridEl);

		return () => {
			if (scrollHandler)
				window.removeEventListener("scroll", scrollHandler);
			resizeObserver?.disconnect();
		};
	});

	// reset range เมื่อ assets เปลี่ยน
	$effect(() => {
		assets;
		visibleStart = 0;
		visibleEnd = Math.min(100, assets.length);
		tick().then(updateVisibleRange);
	});

	// items ที่จะ render จริง
	let visibleAssets = $derived(assets.slice(visibleStart, visibleEnd));
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
					onkeydown={(e) => e.key === "Enter" && jumpTo()}
				/>
				<button
					class="jump-trigger"
					onclick={jumpTo}
					aria-label="Jump to ID"
				>
					<i class="fa-solid fa-arrow-right"></i>
				</button>
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

	<div class="asset-grid" bind:this={gridEl}>
		{#if visibleStart > 0}
			<div style="grid-column: 1/-1; height: {visibleStart * 2}px"></div>
		{/if}
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
						src={assetThumbSrc(asset)}
						alt={asset.id}
						loading="lazy"
						onload={(e) => {
							const img = e.currentTarget as HTMLImageElement;
							if (parseFloat(img.style.opacity || "1") < 0.5)
								return;
							recordResolvedProductThumb(asset.id, img.src);
						}}
						onerror={(e) => handleAssetThumbError(e, asset)}
					/>
					<div class="node-id">#{asset.id}</div>
				</div>
				<div class="card-overlay">
					<i class="fa-solid fa-expand"></i>
				</div>
			</div>
		{/each}
		{#if visibleEnd < assets.length}
			<div
				style="grid-column: 1/-1; height: {(assets.length -
					visibleEnd) *
					2}px"
			></div>
		{/if}
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

<!-- ══════════════════════════════════════════════
     POPUP — IG-style carousel
══════════════════════════════════════════════ -->
{#if selectedAsset}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="gallery-overlay" onclick={closeGallery} role="presentation">
		<!-- Close -->
		<button class="close-trigger" onclick={closeGallery} aria-label="Close">
			<i class="fa-solid fa-xmark"></i>
		</button>

		<!-- Prev / Next asset (Shift+Arrow) -->
		<div class="asset-nav">
			<button
				class="asset-nav-btn"
				onclick={(e) => {
					e.stopPropagation();
					navigateGallery("prev");
				}}
				disabled={assets.findIndex(
					(a) => a.id === selectedAsset!.id,
				) === 0}
				aria-label="Previous asset"
			>
				<i class="fa-solid fa-angle-left"></i>
			</button>
			<button
				class="asset-nav-btn"
				onclick={(e) => {
					e.stopPropagation();
					navigateGallery("next");
				}}
				disabled={assets.findIndex(
					(a) => a.id === selectedAsset!.id,
				) ===
					assets.length - 1}
				aria-label="Next asset"
			>
				<i class="fa-solid fa-angle-right"></i>
			</button>
		</div>

		<!-- Modal card -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="gallery-module"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="viewer-core">
				<!-- ── LEFT: Carousel ─────────────────── -->
				<div class="viewer-stage">
					<!-- Slide track: horizontal scroll + snap -->
					<div
						class="carousel-track"
						bind:this={carouselTrackEl}
						onscroll={handleCarouselScroll}
					>
						{#each carouselSlides as slideUrl, i}
							<div class="carousel-slide">
								<img
									src={slideUrl}
									alt="slide {i + 1}"
									class="viewer-img"
									loading="eager"
									onload={i === 0
										? handleModalMainLoad
										: undefined}
									onerror={(e) =>
										handleModalSlideError(e, slideUrl)}
								/>
							</div>
						{/each}
						{#if modalLoadingSkus && carouselSlides.length === 0}
							<div class="carousel-slide carousel-slide--loading">
								<i class="fa-solid fa-spinner fa-spin"></i>
							</div>
						{/if}
					</div>

					<!-- IG prev/next slide arrows -->
					{#if carouselSlides.length > 1}
						<button
							class="slide-arrow slide-arrow--prev"
							onclick={() => goCarousel("prev")}
							disabled={carouselIdx === 0}
							aria-label="Previous image"
						>
							<i class="fa-solid fa-chevron-left"></i>
						</button>
						<button
							class="slide-arrow slide-arrow--next"
							onclick={() => goCarousel("next")}
							disabled={carouselIdx >= carouselSlides.length - 1}
							aria-label="Next image"
						>
							<i class="fa-solid fa-chevron-right"></i>
						</button>
					{/if}

					<!-- IG dots -->
					{#if carouselSlides.length > 1 || modalLoadingSkus}
						<div class="ig-dots-bar">
							{#each carouselSlides as _, i}
								<button
									class="ig-dot"
									class:active={carouselIdx === i}
									onclick={() => {
										carouselIdx = i;
										if (carouselSlides[i])
											modalMainUrl = carouselSlides[i];
										scrollCarouselToIndex(i, "smooth");
									}}
									aria-label="Go to image {i + 1}"
								></button>
							{/each}
							{#if modalLoadingSkus}
								<span class="ig-dot-spinner">
									<i class="fa-solid fa-spinner fa-spin"></i>
								</span>
							{/if}
						</div>
					{/if}

					<!-- Slide counter (top-right) -->
					{#if carouselSlides.length > 1}
						<div class="slide-counter">
							{carouselIdx + 1} / {carouselSlides.length}
						</div>
					{/if}
				</div>

				<!-- ── RIGHT: Metadata ────────────────── -->
				<div class="viewer-meta">
					<div class="meta-header">
						<span class="mono-label"
							>{assetType.toUpperCase()}_NODE</span
						>
						<h3 class="technical-title">#{selectedAsset.id}</h3>
					</div>

					<div class="meta-actions">
						<button
							class="button-pill-outline"
							onclick={() => {
								navigator.clipboard.writeText(currentCopyUrl());
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
							onclick={() =>
								window.open(currentCopyUrl(), "_blank")}
						>
							View Full Asset <i class="fa-solid fa-expand ms-2"
							></i>
						</button>
					</div>

					{#if carouselSlides.length > 1}
						<p class="meta-hint">
							<i class="fa-solid fa-images me-1"></i>
							{carouselSlides.length} variants — ใช้ลูกศรหรือจุดเพื่อเลื่อน
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.jump-box {
		max-width: 200px;
		gap: 10px !important;
	}

	.jump-trigger {
		background: var(--co-near-black);
		color: #fff;
		border: none;
		border-radius: 6px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
		flex-shrink: 0;
	}

	.jump-trigger:hover {
		background: var(--co-blue);
		transform: translateX(2px);
	}

	/* ── Asset Grid ──────────────────────────────── */
	@media (max-width: 768px) {
		.filter-pills {
			justify-content: space-between;
		}
		.filter-pills button {
			flex: 1;
		}
	}

	.asset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 24px;
	}

	@media (max-width: 640px) {
		.asset-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: 16px;
		}
	}

	@media (max-width: 488px) {
		.filter-pills {
			width: 100%;
		}

		.technical-select {
			width: 100%;
		}

		.technical-select select {
			width: 100%;
		}
	}

	.editorial-card {
		aspect-ratio: 1 / 1;
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

	/* ── Overlay backdrop ────────────────────────── */
	.gallery-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		z-index: 3000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.close-trigger {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		z-index: 10;
	}
	.close-trigger:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* ── Prev / Next asset buttons ───────────────── */
	.asset-nav {
		position: absolute;
		inset: 0;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 12px;
		pointer-events: none;
		z-index: 5;
	}

	.asset-nav-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.9);
		border: none;
		color: #111;
		font-size: 15px;
		cursor: pointer;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
		transition: all 0.2s;
	}
	.asset-nav-btn:hover:not(:disabled) {
		background: #fff;
		transform: scale(1.06);
	}
	.asset-nav-btn:disabled {
		opacity: 0.15;
		cursor: default;
	}

	/* ── Gallery Module ──────────────────────────── */
	.gallery-module {
		width: calc(100% - 128px);
		max-width: 980px;
		animation: modal-in 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	@keyframes modal-in {
		from {
			transform: scale(0.93);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* ── Viewer core: desktop side-by-side ───────── */
	.viewer-core {
		display: flex;
		flex-direction: row;
		background: #000;
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);
		max-height: 88vh;
	}

	/* ── Carousel stage (left panel) ─────────────── */
	.viewer-stage {
		position: relative;
		flex: 0 0 60%;
		overflow: hidden;
		background: #0a0a0a;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 340px;
	}

	/* Slide track — horizontal scroll (swipe / drag) */
	.carousel-track {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		width: 100%;
		height: 100%;
		overflow-x: scroll;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
	}

	.carousel-slide {
		flex: 0 0 100%;
		min-width: 100%;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		overflow-x: scroll;
		overflow-y: hidden;
		box-sizing: border-box;
	}

	.carousel-slide--loading {
		color: rgba(255, 255, 255, 0.4);
		font-size: 28px;
	}

	.viewer-img {
		display: block;
		width: 100%;
		max-height: 72vh;
		object-fit: contain;
		user-select: none;
		-webkit-user-drag: none;
	}

	/* ── In-slide left/right arrows (IG style) ───── */
	.slide-arrow {
		position: absolute;
		top: 50%;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.88);
		border: none;
		color: #111;
		font-size: 12px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
		transition: all 0.18s;
		z-index: 4;
	}
	.slide-arrow--prev {
		left: 10px;
	}
	.slide-arrow--next {
		right: 10px;
	}
	.slide-arrow:hover:not(:disabled) {
		background: #fff;
	}
	.slide-arrow:disabled {
		opacity: 0.2;
		cursor: default;
	}

	/* ── IG dots bar ─────────────────────────────── */
	.ig-dots-bar {
		position: absolute;
		bottom: 12px;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		z-index: 4;
	}

	.ig-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.4);
		border: none;
		padding: 0;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}
	.ig-dot.active {
		background: #fff;
		transform: scale(1.3);
	}
	.ig-dot:hover:not(.active) {
		background: rgba(255, 255, 255, 0.7);
	}

	.ig-dot-spinner {
		font-size: 9px;
		color: rgba(255, 255, 255, 0.55);
		display: flex;
		align-items: center;
	}

	/* ── Slide counter (top-right of stage) ──────── */
	.slide-counter {
		position: absolute;
		top: 12px;
		right: 12px;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		color: #fff;
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		font-weight: 600;
		padding: 3px 9px;
		border-radius: 20px;
		z-index: 4;
		pointer-events: none;
	}

	/* ── Metadata panel (right panel) ────────────── */
	.viewer-meta {
		flex: 1;
		min-width: 0;
		background: var(--co-white, #fff);
		padding: 36px 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		overflow-y: auto;
	}

	.meta-header .mono-label {
		opacity: 0.45;
		font-size: 11px;
		letter-spacing: 0.06em;
	}
	.meta-header .technical-title {
		font-size: 24px;
		font-weight: 700;
		margin-top: 4px;
		color: var(--bs-black, #111);
	}

	.meta-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: auto;
	}

	.meta-hint {
		font-size: 12px;
		color: var(--co-muted, #888);
		margin: 0;
	}

	.carousel-track::-webkit-scrollbar {
		display: none;
	}

	/* สำหรับ Firefox */
	.carousel-track {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	/* ── Responsive: mobile bottom-sheet ─────────── */
	@media (max-width: 768px) {
		.gallery-overlay {
			padding: 0;
		}

		.gallery-module {
			overflow-y: auto;
		}

		.viewer-core {
			flex-direction: column;
		}

		.viewer-stage {
			flex: 0 0 auto;
			width: 100%;
			aspect-ratio: 1 / 1;
			min-height: 0;
		}

		.viewer-meta {
			padding: 24px 20px 32px;
		}

		.meta-actions button {
			flex: 1;
			min-width: 140px;
		}

		.close-trigger {
			top: 14px;
			right: 14px;
			background: rgba(0, 0, 0, 0.45);
			border-color: transparent;
		}
	}
</style>
