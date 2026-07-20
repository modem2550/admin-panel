import type { PageServerLoad } from './$types';
import { buildIamHeaders, getValidAccessToken } from '$lib/server/iamAuth';

const BASE_AUCTION_URL = 'https://iamtoken.app/api/auction/v1/auction';
const POLL_LIST_URL = 'https://iamtoken.app/api/poll/v2/election-poll';

export interface AuctionEvent {
	id: string;
	name: string;
	image: string;
	auctionItemCount: number;
	startDate: string;
	endDate: string;
	tokenSymbol: string;
	eventStatus: string;
}

export interface PollEvent {
	id: string;
	pollName: string;
	question: string;
	coverPhotoUrl: string;
	startDate: string;
	endDate: string;
	tokenName: string;
	eventStatus: string;
}

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const accessToken = await getValidAccessToken(fetch);
		const headers = buildIamHeaders(accessToken);

		const [auctions, polls] = await Promise.all([
			fetchAuctionEvents(fetch, headers),
			fetchPolls(fetch, headers),
		]);

		return {
			auctions,
			polls,
		};
	} catch (err: any) {
		console.error('Error loading auctions:', err);
		return {
			auctions: [],
			polls: [],
			error: err.message || 'Failed to load auctions/polls',
		};
	}
};

async function fetchAuctionEvents(
	svelteFetch: typeof fetch,
	headers: Record<string, string>,
): Promise<AuctionEvent[]> {
	const events: AuctionEvent[] = [];
	let page = 1;

	while (true) {
		const url = `${BASE_AUCTION_URL}?page=${page}&pageSize=20&status=ended`;
		const res = await svelteFetch(url, { headers });
		if (!res.ok) throw new Error(`HTTP error ${res.status}`);

		const data = await res.json();
		const items = data?.data?.items || [];

		if (items.length === 0) break;

		for (const a of items) {
			events.push({
				id: a.id,
				name: a.name,
				image: a.image || '',
				auctionItemCount: a.auctionItemCount ?? 0,
				startDate: a.startDate || '',
				endDate: a.endDate || '',
				tokenSymbol: a.tokenSymbol || '',
				eventStatus: a.eventStatus || '',
			});
		}

		const pagination = data?.data?.pagination || {};
		const total = pagination.totalRecords ?? events.length;

		if (events.length >= total) break;

		page++;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return events;
}

async function fetchPolls(
	svelteFetch: typeof fetch,
	headers: Record<string, string>,
): Promise<PollEvent[]> {
	try {
		const res = await svelteFetch(`${POLL_LIST_URL}?page=1&limitPerPage=100`, { headers });
		if (!res.ok) throw new Error(`HTTP error ${res.status} fetching poll list`);

		const listJson = await res.json();
		const pollList = listJson?.data?.data || [];

		return pollList.map((p: Record<string, unknown>) => ({
			id: p.id as string,
			pollName: (p.pollName as string) || '',
			question: (p.question as string) || '',
			coverPhotoUrl: (p.coverPhotoUrl as string) || '',
			startDate: (p.startDate as string) || '',
			endDate: (p.endDate as string) || '',
			tokenName: (p.tokenName as string) || '',
			eventStatus: (p.eventStatus as string) || '',
		}));
	} catch (err) {
		console.error('Failed to fetch polls list:', err);
		return [];
	}
}
