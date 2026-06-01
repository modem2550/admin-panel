import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { unproxyUrl } from '$lib/bnk48';
import { getToken } from '$lib/bnk48.server';

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const { default: ffmpegPath } = await import('ffmpeg-static');
const { default: ffprobeStatic } = await import('ffprobe-static');
const ffprobePath = ffmpegPath ? ffmpegPath.replace('app.asar', 'app.asar.unpacked') : null;

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

    encoder?: VideoEncoder;

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

type VideoEncoder =
    | 'h264_videotoolbox'
    | 'h264_nvenc'
    | 'h264_amf'
    | 'h264_qsv'
    | 'h264_vaapi'
    | 'libx264';

function getEncoderPriority(): VideoEncoder[] {
    if (process.platform === 'darwin') {
        return ['h264_videotoolbox', 'libx264'];
    }
    if (process.platform === 'win32') {
        return ['h264_nvenc', 'h264_amf', 'h264_qsv', 'libx264'];
    }
    return ['h264_nvenc', 'h264_vaapi', 'libx264'];
}

function isHardwareEncoder(encoder: VideoEncoder): boolean {
    return encoder !== 'libx264';
}

/* -------------------------------------------------------------------------- */
/*                                  STARTUP                                   */
/* -------------------------------------------------------------------------- */

const STATE_FILE = path.join(process.env.TMPDIR || '/tmp', '48cms-jobs.json');

function persistJobs() {
    try {
        const serializable = Array.from(jobs.entries()).map(([id, job]) => [id, {
            id: job.id,
            fileName: job.fileName,
            status: job.status,
            filePath: job.filePath,
            progress: job.progress,
            error: job.error,
            duration: job.duration,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            encoder: job.encoder,
        }]);
        fs.writeFileSync(STATE_FILE, JSON.stringify(serializable), 'utf-8');
    } catch { /* ignore */ }
}

function restoreJobs() {
    try {
        if (!fs.existsSync(STATE_FILE)) return;
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as [string, any][];
        for (const [id, job] of data) {
            if (job.status === 'processing' || job.status === 'queued') {
                job.status = 'failed';
                job.error = 'App was restarted during download';
            }
            jobs.set(id, job);
        }
    } catch { /* ignore */ }
}

restoreJobs();
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
    encoder: VideoEncoder
): string[] {
    const videoArgs: string[] = (() => {
        switch (encoder) {
            case 'h264_videotoolbox':
                return ['-c:v', 'h264_videotoolbox', '-b:v', '3M', '-maxrate:v', '3.5M', '-bufsize:v', '6M'];
            case 'h264_nvenc':
                return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-b:v', '3M', '-maxrate:v', '3.5M'];
            case 'h264_amf':
                return ['-c:v', 'h264_amf', '-quality', 'balanced', '-b:v', '3M'];
            case 'h264_qsv':
                return ['-c:v', 'h264_qsv', '-preset', 'medium', '-b:v', '3M'];
            case 'h264_vaapi':
                return ['-vaapi_device', '/dev/dri/renderD128', '-c:v', 'h264_vaapi', '-b:v', '3M'];
            case 'libx264':
                return ['-c:v', 'libx264', '-preset', 'fast', '-crf', '22'];
        }
    })();

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

const FFPROBE_TIMEOUT_MS = 30_000;

async function probeDuration(
    url: string,
    token: string
): Promise<number> {
    return new Promise((resolve) => {
        const ffprobe = spawn(ffprobePath, [
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
            clearTimeout(timer);
            const duration = parseFloat(stdout.trim());



            resolve(Number.isFinite(duration) ? duration : 0);
        });

        ffprobe.on('error', () => {
            clearTimeout(timer);
            resolve(0);
        });

        const timer = setTimeout(() => {
            try { ffprobe.kill('SIGKILL'); } catch { }
            resolve(0);
        }, FFPROBE_TIMEOUT_MS);
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
            ffmpegPath as string,
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
        'nvenc',
        'amf',
        'qsv',
        'vaapi',
        'hardware accelerator',
        'Cannot load libcuda',
        'No device available',
        'Device creation failed',
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
    persistJobs();

    try {
        /* ---------------------------- Probe Duration --------------------------- */

        if (!job.duration) {


            job.duration = await probeDuration(
                realUrl,
                token
            );


        }

        /* --------------------------- Encoder Attempt -------------------------- */

        const encoders = getEncoderPriority();

        let success = false;
        let lastError = '';

        for (const encoder of encoders) {
            try {
                job.encoder = encoder;

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

                removeTempFile(tempFilePath);

                if (isHardwareEncoder(encoder) && isRecoverableHardwareError(message)) {
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
        persistJobs();


    } catch (err) {
        const message =
            err instanceof Error
                ? err.message
                : String(err);

        job.status = 'failed';
        job.error = message;

        job.completedAt = Date.now();
        persistJobs();

        removeTempFile(tempFilePath);


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
    persistJobs();

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
    persistJobs();

    return true;
}