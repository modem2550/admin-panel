import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { unproxyUrl } from '$lib/bnk48';
import { getToken } from '$lib/bnk48.server';

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface DownloadJob {
    id: string;
    progress: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';

    filePath?: string;
    fileName: string;

    error?: string;

    duration?: number;

    startedAt?: number;
    completedAt?: number;

    encoder?: 'h264_videotoolbox' | 'libx264';

    ffmpegPid?: number;
}

export const jobs = new Map<string, DownloadJob>();

const TEMP_DIR = path.join(os.tmpdir(), 'admin-panel-downloads');

const MAX_CONCURRENT_JOBS = 2;
const JOB_RETENTION_MS = 10 * 60 * 1000;
const FILE_RETENTION_MS = 24 * 60 * 60 * 1000;
const FFMPEG_TIMEOUT_MS = 30 * 60 * 1000;

fs.mkdirSync(TEMP_DIR, { recursive: true });

interface QueueItem {
    job: DownloadJob;
    realUrl: string;
    token: string;
    tempFilePath: string;
}

const pendingQueue: QueueItem[] = [];

let activeJobs = 0;

/* -------------------------------------------------------------------------- */
/*                                  STARTUP                                   */
/* -------------------------------------------------------------------------- */

cleanupStaleTempFiles();

function cleanupStaleTempFiles() {
    try {
        const files = fs.readdirSync(TEMP_DIR);
        const cutoff = Date.now() - FILE_RETENTION_MS;

        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);

            try {
                const stat = fs.statSync(filePath);

                if (stat.mtimeMs < cutoff) {
                    fs.unlinkSync(filePath);
                }
            } catch {
                // ignore
            }
        }
    } catch {
        // ignore
    }
}

/* -------------------------------------------------------------------------- */
/*                                   UTILS                                    */
/* -------------------------------------------------------------------------- */

function removeTempFile(filePath?: string) {
    if (!filePath) return;

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.warn(`[Job Manager] Failed to delete temp file`, err);
    }
}

function cleanupJobLater(jobId: string) {
    setTimeout(() => {
        jobs.delete(jobId);
    }, JOB_RETENTION_MS);
}

function parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');

    if (parts.length !== 3) return 0;

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);

    return hours * 3600 + minutes * 60 + seconds;
}

function updateProgress(job: DownloadJob, line: string) {
    if (!job.duration || job.duration <= 0) return;

    const match = line.match(/time=([\d:.]+)/);

    if (!match) return;

    const currentTime = parseTimeToSeconds(match[1]);

    if (!currentTime) return;

    const progress = Math.min(
        99,
        Math.round((currentTime / job.duration) * 100)
    );

    if (progress > job.progress) {
        job.progress = progress;
    }
}

function buildFfmpegArgs(
    url: string,
    token: string,
    outputPath: string,
    encoder: 'h264_videotoolbox' | 'libx264'
): string[] {
    const videoArgs =
        encoder === 'h264_videotoolbox'
            ? [
                  '-c:v',
                  'h264_videotoolbox',

                  '-b:v',
                  '3M',

                  '-maxrate:v',
                  '3.5M',

                  '-bufsize:v',
                  '6M',
              ]
            : [
                  '-c:v',
                  'libx264',

                  '-preset',
                  'fast',

                  '-crf',
                  '22',

                  '-movflags',
                  '+faststart',
              ];

    return [
        '-headers',
        `Authorization: Bearer ${token}\r\n`,

        '-i',
        url,

        ...videoArgs,

        '-vf',
        "scale='min(1920,iw)':-2:flags=lanczos",

        '-profile:v',
        'main',

        '-pix_fmt',
        'yuv420p',

        '-movflags',
        '+faststart',

        '-c:a',
        'aac',

        '-ar',
        '44100',

        '-b:a',
        '192k',

        '-threads',
        '0',

        '-y',

        outputPath,
    ];
}

/* -------------------------------------------------------------------------- */
/*                                FFPROBE                                     */
/* -------------------------------------------------------------------------- */

async function probeDuration(
    url: string,
    token: string
): Promise<number> {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-headers',
            `Authorization: Bearer ${token}\r\n`,

            '-v',
            'error',

            '-show_entries',
            'format=duration',

            '-of',
            'default=noprint_wrappers=1:nokey=1',

            url,
        ]);

        let stdout = '';
        let stderr = '';

        ffprobe.stdout.on('data', (d) => {
            stdout += d.toString();
        });

        ffprobe.stderr.on('data', (d) => {
            stderr += d.toString();
        });

        ffprobe.on('close', () => {
            const duration = parseFloat(stdout.trim());

            if (stderr.trim()) {
                console.warn(`[ffprobe] ${stderr}`);
            }

            resolve(Number.isFinite(duration) ? duration : 0);
        });

        ffprobe.on('error', () => {
            resolve(0);
        });
    });
}

/* -------------------------------------------------------------------------- */
/*                                FFMPEG                                      */
/* -------------------------------------------------------------------------- */

async function spawnFfmpeg(
    args: string[],
    job: DownloadJob
): Promise<void> {
    return new Promise((resolve, reject) => {
        const ffmpeg: ChildProcessWithoutNullStreams = spawn(
            'ffmpeg',
            args
        );

        job.ffmpegPid = ffmpeg.pid;

        let stderrBuffer = '';

        const timeout = setTimeout(() => {
            ffmpeg.kill('SIGKILL');

            reject(new Error('ffmpeg timeout'));
        }, FFMPEG_TIMEOUT_MS);

        ffmpeg.stderr.on('data', (data: Buffer) => {
            stderrBuffer += data.toString();

            const lines = stderrBuffer.split('\n');

            stderrBuffer = lines.pop() || '';

            for (const line of lines) {
                updateProgress(job, line);
            }
        });

        ffmpeg.on('close', (code) => {
            clearTimeout(timeout);

            job.ffmpegPid = undefined;

            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(`ffmpeg exited with code ${code}`)
                );
            }
        });

        ffmpeg.on('error', (err) => {
            clearTimeout(timeout);

            job.ffmpegPid = undefined;

            reject(err);
        });
    });
}

/* -------------------------------------------------------------------------- */
/*                              ENCODER RETRY                                 */
/* -------------------------------------------------------------------------- */

function isRecoverableHardwareError(message: string): boolean {
    const knownErrors = [
        'Unknown encoder',
        'Error initializing output stream',
        'videotoolbox',
        'hardware accelerator',
        'Cannot load libcuda',
    ];

    return knownErrors.some((err) =>
        message.toLowerCase().includes(err.toLowerCase())
    );
}

/* -------------------------------------------------------------------------- */
/*                                  QUEUE                                     */
/* -------------------------------------------------------------------------- */

async function processQueue() {
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
        return;
    }

    const next = pendingQueue.shift();

    if (!next) return;

    activeJobs++;

    try {
        await runJob(
            next.job,
            next.realUrl,
            next.token,
            next.tempFilePath
        );
    } finally {
        activeJobs--;

        processQueue();
    }
}

/* -------------------------------------------------------------------------- */
/*                                 MAIN JOB                                   */
/* -------------------------------------------------------------------------- */

async function runJob(
    job: DownloadJob,
    realUrl: string,
    token: string,
    tempFilePath: string
): Promise<void> {
    job.status = 'processing';
    job.startedAt = Date.now();

    try {
        /* ---------------------------- Probe Duration --------------------------- */

        if (!job.duration) {
            console.log(
                `[Job ${job.id}] Probing duration...`
            );

            job.duration = await probeDuration(
                realUrl,
                token
            );

            console.log(
                `[Job ${job.id}] Duration: ${job.duration}s`
            );
        }

        /* --------------------------- Encoder Attempt -------------------------- */

        const encoders: (
            | 'h264_videotoolbox'
            | 'libx264'
        )[] = ['h264_videotoolbox', 'libx264'];

        let success = false;
        let lastError = '';

        for (const encoder of encoders) {
            try {
                job.encoder = encoder;

                console.log(
                    `[Job ${job.id}] Starting encoder: ${encoder}`
                );

                const args = buildFfmpegArgs(
                    realUrl,
                    token,
                    tempFilePath,
                    encoder
                );

                await spawnFfmpeg(args, job);

                success = true;

                break;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : String(err);

                lastError = message;

                console.warn(
                    `[Job ${job.id}] Encoder failed (${encoder}): ${message}`
                );

                removeTempFile(tempFilePath);

                if (
                    encoder === 'h264_videotoolbox' &&
                    isRecoverableHardwareError(message)
                ) {
                    console.log(
                        `[Job ${job.id}] Falling back to libx264...`
                    );

                    job.progress = 0;

                    continue;
                }

                throw err;
            }
        }

        /* ------------------------------ Success ------------------------------- */

        if (!success) {
            throw new Error(lastError || 'Encoding failed');
        }

        job.progress = 100;
        job.status = 'completed';

        job.completedAt = Date.now();

        console.log(
            `[Job ${job.id}] Completed in ${(
                (job.completedAt - job.startedAt!) /
                1000
            ).toFixed(1)}s`
        );
    } catch (err) {
        const message =
            err instanceof Error
                ? err.message
                : String(err);

        job.status = 'failed';
        job.error = message;

        job.completedAt = Date.now();

        removeTempFile(tempFilePath);

        console.error(
            `[Job ${job.id}] Failed: ${message}`
        );
    } finally {
        cleanupJobLater(job.id);
    }
}

/* -------------------------------------------------------------------------- */
/*                              PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function startDownloadJob(
    videoUrl: string,
    fileName: string,
    initialDuration?: number
): Promise<string> {
    const jobId = crypto.randomUUID();

    const realUrl = unproxyUrl(videoUrl);

    const token = await getToken();

    const tempFilePath = path.join(
        TEMP_DIR,
        `${crypto.randomUUID()}.mp4`
    );

    const job: DownloadJob = {
        id: jobId,

        progress: 0,

        status: 'queued',

        filePath: tempFilePath,

        fileName,

        duration:
            initialDuration && initialDuration > 0
                ? initialDuration
                : undefined,
    };

    jobs.set(jobId, job);

    pendingQueue.push({
        job,
        realUrl,
        token,
        tempFilePath,
    });

    processQueue();

    return jobId;
}

/* -------------------------------------------------------------------------- */
/*                              OPTIONAL HELPERS                              */
/* -------------------------------------------------------------------------- */

export function getJob(jobId: string) {
    return jobs.get(jobId);
}

export function cancelJob(jobId: string): boolean {
    const job = jobs.get(jobId);

    if (!job) return false;

    if (job.ffmpegPid) {
        try {
            process.kill(job.ffmpegPid, 'SIGKILL');
        } catch {
            //
        }
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = Date.now();

    removeTempFile(job.filePath);

    return true;
}