import { error } from '@sveltejs/kit';
import { getJob } from '$lib/download-manager.server';
import fs from 'fs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.session) {
        throw error(401, 'Unauthorized');
    }

    const { id } = params;
    const job = getJob(id);

    if (!job) {
        throw error(404, 'Job not found');
    }

    if (job.status !== 'completed' || !job.filePath) {
        throw error(400, 'Job not completed');
    }

    if (!fs.existsSync(job.filePath)) {
        throw error(404, 'File not found on disk');
    }

    const stat = fs.statSync(job.filePath);
    const stream = fs.createReadStream(job.filePath);

    return new Response(stream as any, {
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(stat.size),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(job.fileName)}.mp4"`
        }
    });
};
