import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { buildIamHeaders, getValidAccessToken } from '$lib/server/iamAuth';

const BASE_AUCTION_URL = 'https://iamtoken.app/api/auction/v1/auction';

export interface AuctionItem {
	auction_id: string;
	auction_name: string;
	item_id: string;
	item_name: string;
	category: string;
	bidding_amount: number;
	image_url: string;
}

export interface AuctionDetail {
	id: string;
	name: string;
	image: string;
	startDate: string;
	endDate: string;
	tokenSymbol: string;
	eventStatus: string;
	auctionItemCount: number;
}

export const load: PageServerLoad = async ({ fetch, params }) => {
	const auctionId = params.id;

	try {
		const accessToken = await getValidAccessToken(fetch);
		const headers = buildIamHeaders(accessToken);

		const url = `${BASE_AUCTION_URL}/${auctionId}`;
		const res = await fetch(url, { headers });

		if (!res.ok) {
			if (res.status === 404) error(404, 'Auction not found');
			throw new Error(`HTTP error ${res.status}`);
		}

		const json = await res.json();
		const data = json?.data;

		if (!data) error(404, 'Auction not found');

		const auction: AuctionDetail = {
			id: data.id || auctionId,
			name: data.name || '',
			image: data.image || '',
			startDate: data.startDate || '',
			endDate: data.endDate || '',
			tokenSymbol: data.tokenSymbol || '',
			eventStatus: data.eventStatus || '',
			auctionItemCount: data.auctionItemCount ?? 0,
		};

		const rawItems = data.items || [];
		const items: AuctionItem[] = rawItems.map((it: Record<string, unknown>) => {
			const categories = it.categoryName || [];
			const categoryStr = Array.isArray(categories)
				? categories.join(', ')
				: String(categories);

			return {
				auction_id: auction.id,
				auction_name: auction.name,
				item_id: (it.id as string) || '',
				item_name: (it.name as string) || '',
				category: categoryStr,
				bidding_amount: (it.currentBiddingAmount as number) || 0,
				image_url: (it.image as string) || '',
			};
		});

		return { auction, items };
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error(`Error loading auction ${auctionId}:`, err);
		return {
			auction: null,
			items: [],
			error: err.message || 'Failed to load auction',
		};
	}
};
