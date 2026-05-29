import { json } from '@sveltejs/kit';
import { getVOD } from '$lib/bnk48.server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { videoId } = await request.json();
        if (!videoId) return json({ error: 'Video ID is required' }, { status: 400 });
        const vod = await getVOD(videoId);
        return json({ vod });
    } catch (err: any) {
        console.error(`[Playback Action] VOD Error: ${err.message}`);
        return json({ error: err.message }, { status: 500 });
    }
};
