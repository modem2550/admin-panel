// @ts-nocheck
import { getMemberIdByName, getMemberLives, getVOD, getTimeline } from '$lib/bnk48.server';
import type { MemberLive, VODResult, TimelineResult } from '$lib/bnk48';
import type { PageServerLoad, Actions } from './$types';

export const load = async () => {
    return {};
};

export const actions = {
    search: async ({ request }: import('./$types').RequestEvent) => {
        const data = await request.formData();
        const name = data.get('name')?.toString() || '';

        console.log(`[Playback Action] Search requested for: "${name}"`);
        if (!name) return { error: 'Search term is required' };

        // ── Timeline Post ──────────────────────────────────────────────────────
        if (name.includes('timeline/content-member-timeline/') || name.includes('timeline/content-member-batch-thankyou/')) {
            let id = '';
            if (name.includes('timeline/content-member-timeline/')) {
                id = name.split('timeline/content-member-timeline/')[1].split(/[\s?#]/)[0].trim();
            } else {
                id = name.split('timeline/content-member-batch-thankyou/')[1].split(/[\s?#]/)[0].trim();
            }
            
            console.log(`[Playback Action] Detected Timeline Post ID: ${id}`);
            try {
                const timeline: TimelineResult = await getTimeline(id);
                return { directTimeline: timeline };
            } catch (err: any) {
                console.error(`[Playback Action] Timeline Error: ${err.message}`);
                return { error: `Timeline post error: ${err.message}` };
            }
        }

        // ── Live Playback (member-playback/ หรือ content-member-live-playback/) ──
        if (
            name.includes('member-playback/') ||
            name.includes('timeline/content-member-live-playback/')
        ) {
            let id = '';
            if (name.includes('member-playback/')) {
                id = name.split('member-playback/')[1].split(/[\s?#]/)[0];
            } else {
                id = name.split('timeline/content-member-live-playback/')[1].split(/[\s?#]/)[0];
            }
            id = id.trim();
            console.log(`[Playback Action] Detected Live Playback ID: ${id}. Fetching VOD...`);
            try {
                const vod: VODResult = await getVOD(id);
                return { directVod: vod };
            } catch (err: any) {
                console.error(`[Playback Action] URL Error: ${err.message}`);
                return { error: `Invalid URL or video not found: ${err.message}` };
            }
        }

        // ── Member name search ─────────────────────────────────────────────────
        try {
            const memberId = await getMemberIdByName(name);
            if (!memberId) {
                console.log(`[Playback Action] Member "${name}" NOT found.`);
                return { error: 'Member not found' };
            }
            console.log(`[Playback Action] Found member "${name}" with ID: ${memberId}. Fetching lives...`);
            const lives: MemberLive[] = await getMemberLives(memberId, 0, 40);
            console.log(`[Playback Action] Successfully fetched ${lives.length} lives for "${name}".`);
            return { lives, memberName: name, memberId };
        } catch (err: any) {
            console.error(`[Playback Action] Search Error: ${err.message}`);
            return { error: err.message };
        }
    },

    getVOD: async ({ request }: import('./$types').RequestEvent) => {
        const data = await request.formData();
        const videoId = data.get('videoId')?.toString();
        console.log(`[Playback Action] VOD details requested for videoId: ${videoId}`);
        if (!videoId) return { error: 'Video ID is required' };
        try {
            const vod: VODResult = await getVOD(videoId);
            console.log(`[Playback Action] VOD found: ${vod.fileName}`);
            return { vod };
        } catch (err: any) {
            console.error(`[Playback Action] VOD Error: ${err.message}`);
            return { error: err.message };
        }
    },
};;null as any as PageServerLoad;;null as any as Actions;