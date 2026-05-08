import { json } from "@sveltejs/kit";
//#region src/routes/api/check-assets/latest/+server.ts
async function probe(targetUrl) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 5e3);
	try {
		const resp = await fetch(targetUrl, {
			method: "HEAD",
			signal: controller.signal
		});
		clearTimeout(timeout);
		return resp.ok;
	} catch {
		clearTimeout(timeout);
		return null;
	}
}
var GET = async ({ url }) => {
	const type = url.searchParams.get("type") || "product";
	let latest = null;
	function makeUrl(id) {
		const padded = id.toString().padStart(4, "0");
		return type === "product" ? `https://img.bnk48cdn.net/shop/product/${padded}/sku-1.jpg` : `https://img.bnk48cdn.net/shop/product-group/${padded}.jpg`;
	}
	let current = 0;
	let step = 1e3;
	const maxId = type === "product" ? 25e3 : 5e3;
	while (current + step <= maxId) {
		const target = current + step;
		let exists = await probe(makeUrl(target));
		if (exists === null) exists = await probe(makeUrl(target));
		if (exists === true) {
			current = target;
			latest = {
				id: target.toString().padStart(4, "0"),
				url: makeUrl(target)
			};
		} else {
			const lookahead = target + 200;
			let lookExists = await probe(makeUrl(lookahead));
			if (lookExists === null) lookExists = await probe(makeUrl(lookahead));
			if (lookExists === true) {
				current = lookahead;
				latest = {
					id: lookahead.toString().padStart(4, "0"),
					url: makeUrl(lookahead)
				};
			} else if (step > 10) step = Math.floor(step / 5);
			else break;
		}
	}
	let fine = current;
	while (fine < current + 1500 && fine <= maxId) {
		let exists = await probe(makeUrl(fine + 1));
		if (exists === null) exists = await probe(makeUrl(fine + 1));
		if (exists === true) {
			fine++;
			latest = {
				id: fine.toString().padStart(4, "0"),
				url: makeUrl(fine)
			};
		} else {
			let nextExists = await probe(makeUrl(fine + 2));
			if (nextExists === null) nextExists = await probe(makeUrl(fine + 2));
			if (nextExists === true) {
				fine += 2;
				latest = {
					id: fine.toString().padStart(4, "0"),
					url: makeUrl(fine)
				};
			} else break;
		}
	}
	if (latest) {
		const prefix = "img";
		const parsed = new URL(latest.url);
		const path = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
		return json({
			id: latest.id,
			url: `/p/${prefix}/${path}`
		});
	}
	return json({
		id: "0000",
		url: ""
	});
};
//#endregion
export { GET };
