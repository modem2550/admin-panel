import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { buildIamHeaders, getValidAccessToken } from '$lib/server/iamAuth';

const POLL_LIST_URL = 'https://iamtoken.app/api/poll/v2/election-poll';
const POLL_DETAIL_URL = 'https://iamtoken.app/api/poll/v1/election-poll/search-result';

export interface PollResult {
	teamName: string;
	answer: string;
	imageUrl: string;
	thankyouImageUrl?: string;
	numOfVoter: string;
}

export interface PollDetail {
	id: string;
	pollName: string;
	question: string;
	coverPhotoUrl: string;
	startDate: string;
	endDate: string;
	tokenName: string;
	eventStatus: string;
	results: PollResult[];
}

export const load: PageServerLoad = async ({ fetch, params }) => {
	const pollId = params.id;

	try {
		const accessToken = await getValidAccessToken(fetch);
		const headers = buildIamHeaders(accessToken);

		const [listRes, detailRes] = await Promise.all([
			fetch(`${POLL_LIST_URL}?page=1&limitPerPage=100`, { headers }),
			fetch(`${POLL_DETAIL_URL}/${pollId}`, { headers }),
		]);

		if (!detailRes.ok) {
			if (detailRes.status === 404) error(404, 'Poll not found');
			throw new Error(`HTTP error ${detailRes.status} fetching poll detail`);
		}

		const detailJson = await detailRes.json();
		const detail = detailJson?.data;

		if (!detail) error(404, 'Poll not found');

		let listMeta: Record<string, unknown> = {};
		if (listRes.ok) {
			const listJson = await listRes.json();
			const pollList = listJson?.data?.data || [];
			listMeta = pollList.find((p: { id: string }) => p.id === pollId) || {};
		}

		const poll: PollDetail = {
			id: pollId,
			pollName: (detail.pollName as string) || (listMeta.pollName as string) || '',
			question: (detail.question as string) || (listMeta.question as string) || '',
			coverPhotoUrl:
				(detail.coverPhotoUrl as string) || (listMeta.coverPhotoUrl as string) || '',
			startDate: (detail.startDate as string) || (listMeta.startDate as string) || '',
			endDate: (detail.endDate as string) || (listMeta.endDate as string) || '',
			tokenName: (detail.tokenName as string) || (listMeta.tokenName as string) || '',
			eventStatus: (detail.eventStatus as string) || (listMeta.eventStatus as string) || '',
			results: (detail.results as PollResult[]) || [],
		};

		return { poll };
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error(`Error loading poll ${pollId}:`, err);
		return {
			poll: null,
			error: err.message || 'Failed to load poll',
		};
	}
};
