import { json } from '@sveltejs/kit';
import { getJob, cancelJob } from '$lib/download-manager.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {

    const { id } = params;
    const job = getJob(id);

    if (!job) {
        return json({ error: 'Job not found' }, { status: 404 });
    }

    return json({ job });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {

    const { id } = params;
    const success = cancelJob(id);

    if (!success) {
        return json({ error: 'Job not found' }, { status: 404 });
    }

    return json({ success: true });
};
