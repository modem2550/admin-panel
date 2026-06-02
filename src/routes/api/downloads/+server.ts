import { json } from '@sveltejs/kit';
import { startDownloadJob } from '$lib/download-manager.server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {

    try {
        const body = await request.json();
        const { url, fileName, duration } = body;

        if (!url || !fileName) {
            return json({ error: 'Missing url or fileName' }, { status: 400 });
        }

        const jobId = await startDownloadJob(url, fileName, duration);
        return json({ jobId });
    } catch (e: any) {
        return json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
};
