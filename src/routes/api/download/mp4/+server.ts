import { error, json } from '@sveltejs/kit';
import { jobs, startDownloadJob } from '$lib/download-manager.server';
import type { RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';

export const GET: RequestHandler = async ({ url, locals }: RequestEvent) => {
    if (!locals.session) {
        throw error(401, 'Unauthorized');
    }

    const action = url.searchParams.get('action') || 'download';

    if (action === 'start') {
        const videoUrl = url.searchParams.get('url');
        const fileName = url.searchParams.get('name') || 'video';
        const duration = parseFloat(url.searchParams.get('duration') || '0');

        if (!videoUrl) throw error(400, 'Missing URL');

        const jobId = await startDownloadJob(videoUrl, fileName, duration);
        return json({ jobId });
    }

    if (action === 'status') {
        const jobId = url.searchParams.get('jobId');
        if (!jobId) throw error(400, 'Missing Job ID');

        const job = jobs.get(jobId);
        if (!job) throw error(404, 'Job not found');

        return json({
            progress: job.progress,
            status: job.status,
            error: job.error
        });
    }

    if (action === 'download') {
        const jobId = url.searchParams.get('jobId');
        if (!jobId) throw error(400, 'Missing Job ID');

        const job = jobs.get(jobId);
        if (!job) throw error(404, 'Job not found');
        if (job.status !== 'completed' || !job.filePath) {
            throw error(400, 'Job not ready or failed');
        }

        const stats = fs.statSync(job.filePath);
        const fileStream = fs.createReadStream(job.filePath);

        const stream = new ReadableStream({
            start(controller) {
                fileStream.on('data', (chunk) => controller.enqueue(chunk));
                fileStream.on('end', () => {
                    controller.close();
                    // Optional: delay deletion or handle it via a cleanup task
                    // For now, delete after a short delay to ensure stream is flushed
                    setTimeout(() => {
                        if (job.filePath && fs.existsSync(job.filePath)) {
                            fs.unlink(job.filePath, () => {});
                            jobs.delete(jobId);
                        }
                    }, 10000);
                });
                fileStream.on('error', (err) => controller.error(err));
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${job.fileName}.mp4"`,
                'Content-Length': stats.size.toString()
            }
        });
    }

    throw error(400, 'Invalid action');
};
