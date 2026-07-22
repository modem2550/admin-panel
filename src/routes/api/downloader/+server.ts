import { json } from '@sveltejs/kit';
import { findMembersByName, getMemberLives, getMemberTimeline, getVOD, getTimeline, getCampaign } from '$lib/bnk48.server';
import { proxyUrl } from '$lib/bnk48';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json().catch(() => ({}));
        const { videoId, name, type = 'lives', skip = 0, take = 300, lastId, memberId: explicitMemberId } = body;

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
            let memberId: number | null = null;
            let resolvedName = name;

            if (explicitMemberId) {
                // Caller already disambiguated which member they mean (e.g. after
                // picking from a "same name" list) — use that id directly.
                memberId = Number(explicitMemberId);
            } else {
                const matches = findMembersByName(name);

                if (matches.length === 0) {
                    return json({ error: 'Member not found' }, { status: 404 });
                }

                if (matches.length > 1) {
                    // Multiple members share this name (codeName / real name) —
                    // let the client show a picker instead of guessing.
                    return json({
                        members: matches.map((m: any) => ({
                            id: m.id,
                            codeName: m.codeName,
                            displayName: m.displayName,
                            displayNameEn: m.displayNameEn,
                            subtitle: m.subtitle,
                            subtitleEn: m.subtitleEn,
                            brand: m.brand,
                            profileImageUrl: m.profileImageUrl,
                        })),
                    });
                }

                memberId = matches[0].id;
                resolvedName = matches[0].displayNameEn || matches[0].displayName || name;
            }

            if (!memberId) {
                return json({ error: 'Member not found' }, { status: 404 });
            }

            if (type === 'posts') {
                const timelineData = await getMemberTimeline(memberId, skip, take, lastId);
                const rawFeeds = timelineData?.feeds || [];
                const feeds = rawFeeds.filter((f: any) =>
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
                // Cursor to continue from on the next "load more" — advance to the
                // last RAW feed item (not the filtered subset) so the underlying
                // cursor-based pagination doesn't skip or repeat items.
                const nextLastId = rawFeeds.length > 0 ? rawFeeds[rawFeeds.length - 1].id : null;
                const hasMore = rawFeeds.length >= take;
                return json({
                    posts: mappedPosts,
                    memberName: resolvedName,
                    memberId,
                    nextLastId,
                    hasMore,
                });
            } else {
                const lives = await getMemberLives(memberId, skip, take);
                const nextSkip = skip + lives.length;
                const hasMore = lives.length >= take;
                return json({ lives, memberName: resolvedName, memberId, nextSkip, hasMore });
            }
        } catch (err: any) {
            console.error(`[Playback Action] Search Error: ${err.message}`);
            return json({ error: err.message }, { status: 500 });
        }
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
};
