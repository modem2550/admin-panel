import { json } from '@sveltejs/kit';
import { startDownloadJob } from '$lib/download-manager.server';
import type { RequestHandler } from './$types';

import { isRateLimited } from '$lib/rate-limit.server';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
    // Basic auth check if needed
    if (!locals.session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitKey = `download:${locals.session.user?.id ?? getClientAddress()}`;
    if (isRateLimited(rateLimitKey, 10, 60_000)) {
        return json({ error: 'Too many requests' }, { status: 429 });
    }

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
