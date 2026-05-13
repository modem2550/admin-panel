import { getMemberIdByName, getMemberLives, getVOD, getTimeline } from '$lib/bnk48.server';
import type { MemberLive, VODResult, TimelineResult } from '$lib/bnk48';
import type { Actions } from './$types';

export const actions: Actions = {
    search: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name')?.toString() || '';

        if (!name) return { error: 'Search term is required' };

        // ── Timeline Post ──────────────────────────────────────────────────────
        if (name.includes('timeline/content-member-timeline/') || name.includes('timeline/content-member-batch-thankyou/')) {
            let id = '';
            if (name.includes('timeline/content-member-timeline/')) {
                id = name.split('timeline/content-member-timeline/')[1].split(/[\s?#]/)[0].trim();
            } else {
                id = name.split('timeline/content-member-batch-thankyou/')[1].split(/[\s?#]/)[0].trim();
            }
            
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
                return { error: 'Member not found' };
            }
            const lives: MemberLive[] = await getMemberLives(memberId, 0, 40);
            return { lives, memberName: name, memberId };
        } catch (err: any) {
            console.error(`[Playback Action] Search Error: ${err.message}`);
            return { error: err.message };
        }
    },

    getVOD: async ({ request }) => {
        const data = await request.formData();
        const videoId = data.get('videoId')?.toString();
        if (!videoId) return { error: 'Video ID is required' };
        try {
            const vod: VODResult = await getVOD(videoId);
            return { vod };
        } catch (err: any) {
            console.error(`[Playback Action] VOD Error: ${err.message}`);
            return { error: err.message };
        }
    },
};