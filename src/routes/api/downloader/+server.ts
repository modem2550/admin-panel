import { json } from '@sveltejs/kit';
import { getMemberIdByName, getMemberLives, getMemberTimeline, getVOD, getTimeline, getCampaign } from '$lib/bnk48.server';
import { proxyUrl } from '$lib/bnk48';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json().catch(() => ({}));
        const { videoId, name, type = 'lives', skip = 0, take = 300, lastId } = body;

        // ── Case 1: Video ID lookup (formerly get-vod) ─────────────────────────
        if (videoId) {
            const vod = await getVOD(videoId);
            return json({ vod });
        }

        // ── Case 2: Search term query ──────────────────────────────────────────
        if (!name) return json({ error: 'Search term or videoId is required' }, { status: 400 });

        // ── Case 2a: Timeline Post URL Resolution ──────────────────────────────
        if (name.includes('timeline/content-member-timeline/') || name.includes('timeline/content-member-batch-thankyou/')) {
            let id = '';
            if (name.includes('timeline/content-member-timeline/')) {
                id = name.split('timeline/content-member-timeline/')[1].split(/[\s?#]/)[0].trim();
            } else {
                id = name.split('timeline/content-member-batch-thankyou/')[1].split(/[\s?#]/)[0].trim();
            }
            try {
                const timeline = await getTimeline(id);
                return json({ directTimeline: timeline });
            } catch (err: any) {
                console.error(`[Playback Action] Timeline Error: ${err.message}`);
                return json({ error: `Timeline post error: ${err.message}` }, { status: 500 });
            }
        }

        // ── Case 2a-2: Campaign URL Resolution ─────────────────────────────────
        if (name.includes('/campaign/')) {
            const id = name.split('/campaign/')[1].split(/[\s?#]/)[0].trim();
            try {
                const campaign = await getCampaign(id);
                return json({ directCampaign: campaign });
            } catch (err: any) {
                console.error(`[Playback Action] Campaign Error: ${err.message}`);
                return json({ error: `Campaign fetch error: ${err.message}` }, { status: 500 });
            }
        }

        // ── Case 2b: Live Playback URL Resolution ──────────────────────────────
        if (
            name.includes('member-playback/') ||
            name.includes('timeline/content-member-live-playback/')
        ) {
            let id = '';
            let timelinePost: any = null;
            if (name.includes('member-playback/')) {
                id = name.split('member-playback/')[1].split(/[\s?#]/)[0];
            } else {
                const postId = name.split('timeline/content-member-live-playback/')[1].split(/[\s?#]/)[0].trim();
                try {
                    // public.bnk48.io doesn't require auth — use plain fetch
                    const resp = await fetch(`https://public.bnk48.io/timeline/content-member-live-playback/${postId}`);
                    if (resp.ok) {
                        timelinePost = await resp.json();
                        // content.id is the live video ID used by the M3U/VOD API
                        if (timelinePost?.content?.id) {
                            id = String(timelinePost.content.id);
                        } else {
                            id = postId;
                        }
                    } else {
                        id = postId;
                    }
                } catch {
                    id = postId;
                }
            }
            id = id.trim();
            try {
                const vod = await getVOD(id);
                if (timelinePost?.content) {
                    // Merge timeline metadata into VOD info
                    vod.info = {
                        ...vod.info,
                        contentText: timelinePost.content.contentText ?? null,
                        postedAt: timelinePost.content.postedAt ?? null,
                        timelinePostId: timelinePost.id ?? null,
                    };
                }
                return json({ directVod: vod });
            } catch (err: any) {
                console.error(`[Playback Action] URL Error: ${err.message}`);
                return json({ error: `Invalid URL or video not found: ${err.message}` }, { status: 500 });
            }
        }

        // ── Case 2c: Member Name search ────────────────────────────────────────
        try {
            const memberId = await getMemberIdByName(name);
            if (!memberId) {
                return json({ error: 'Member not found' }, { status: 404 });
            }

            if (type === 'posts') {
                const timelineData = await getMemberTimeline(memberId, skip, take, lastId);
                const feeds = (timelineData?.feeds || []).filter((f: any) =>
                    f && f.content && (
                        f.itemType === 'content-member-timeline' ||
                        f.itemType === 'content-member-live-playback' ||
                        f.itemType === 'content-member-batch-thankyou'
                    )
                );
                const mappedPosts = feeds.map((f: any) => {
                    const c = f.content;
                    const images = (c.imageFileUrl || []).filter(Boolean).map(proxyUrl);
                    const thumbnail = proxyUrl(c.thumbImageUrl || c.imageFileUrl?.[0] || '') || '';
                    return {
                        id: f.id,
                        contentId: c.id,
                        itemType: f.itemType,
                        title: c.contentText || '',
                        publishedAt: c.postedAt || '',
                        thumbnail,
                        images,
                        resourceUrl: null as string | null,
                    };
                });
                return json({ posts: mappedPosts, memberName: name, memberId });
            } else {
                const lives = await getMemberLives(memberId, skip, take);
                return json({ lives, memberName: name, memberId });
            }
        } catch (err: any) {
            console.error(`[Playback Action] Search Error: ${err.message}`);
            return json({ error: err.message }, { status: 500 });
        }
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
};
