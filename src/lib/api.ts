/**
 * Client-side API helper for the admin panel.
 * Typed fetch wrappers for all backend endpoints.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

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
  encoder?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  thumbnailImageUrl?: string;
  publishedAt?: string;
  thumbnail?: string;
}

export interface VODResult {
  resourceUrl: string;
  fileName: string;
  thumbnail: string;
  info: Record<string, any>;
}

export interface TimelineResult {
  resourceUrl: string | null;
  images: string[];
  fileName: string;
  thumbnail: string;
  info: Record<string, any>;
}

export interface PostResult {
  id: string;
  contentId: string;
  itemType: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  images: string[];
  resourceUrl: string | null;
}

export interface ArchiveItem {
  id: string;
  url: string;
  title: string;
  description: string;
  date: string;
  time: string;
  placeName: string;
  memberIdList: number[];
  memberNames: string[];
}

export interface ArchiveResponse {
  items: ArchiveItem[];
  total: number;
  skip: number;
  take: number;
}

// ── API Helper ─────────────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed: ${res.status}`, res.status);
  }
  return data as T;
}

// ── Downloader API ─────────────────────────────────────────────────────────────

export interface MemberCandidate {
  id: number;
  codeName: string;
  displayName: string;
  displayNameEn: string;
  subtitle: string;
  subtitleEn: string;
  brand: string;
  profileImageUrl?: string;
}

export async function searchMember(
  name: string,
  type: 'lives' | 'posts' = 'lives',
  skip = 0,
  take = 60,
  lastId?: string,
  memberId?: number
) {
  return apiFetch<any>('/api/downloader', {
    method: 'POST',
    body: JSON.stringify({ name, type, skip, take, lastId, memberId }),
  });
}

export async function getVOD(videoId: string) {
  return apiFetch<{ vod: VODResult }>('/api/downloader', {
    method: 'POST',
    body: JSON.stringify({ videoId }),
  });
}

export async function resolveUrl(name: string) {
  return apiFetch<any>('/api/downloader', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ── Downloads API ──────────────────────────────────────────────────────────────

export async function startDownload(url: string, fileName: string, duration?: number) {
  return apiFetch<{ jobId: string }>('/api/downloads', {
    method: 'POST',
    body: JSON.stringify({ url, fileName, duration }),
  });
}

export async function getJobStatus(jobId: string) {
  return apiFetch<{ job: DownloadJob }>(`/api/downloads/${jobId}`);
}

export async function cancelDownload(jobId: string) {
  return apiFetch<{ success: boolean }>(`/api/downloads/${jobId}`, {
    method: 'DELETE',
  });
}

// ── Assets API ─────────────────────────────────────────────────────────────────

export async function getPlaybackArchive(skip = 0, take = 20) {
  return apiFetch<ArchiveResponse>(`/api/assets/playback?skip=${skip}&take=${take}`);
}

export async function getTheaterArchive(skip = 0, take = 20) {
  return apiFetch<ArchiveResponse>(`/api/assets/theater-archive?skip=${skip}&take=${take}`);
}

export async function getTheaterTicketBooking(skip = 0, take = 20) {
  return apiFetch<ArchiveResponse>(`/api/assets/theater-ticket?skip=${skip}&take=${take}`);
}

export async function triggerScan(type: 'product' | 'group', secret: string) {
  return apiFetch<{ scan_log_id: number; startId: number; endId: number }>('/api/assets/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-scan-secret': secret,
    },
    body: JSON.stringify({ type }),
  });
}

export async function getScanStatus(id: number) {
  return apiFetch<any>(`/api/assets/scan-status?id=${id}`);
}

export async function getScanSku(id: number, type = 'product') {
  return apiFetch<{ skus: number[]; urls: string[] }>(`/api/assets/scan-sku?id=${id}&type=${type}`);
}

export const CAMPAIGN_URL_TYPE = 'campaign';

export async function getLatestAsset(type: 'product' | 'group' | 'campaign') {
  return apiFetch<{ id: string; url: string }>(`/api/check-assets/latest?type=${type}`);
}

export async function checkAssets(type: 'product' | 'group' | 'campaign', start: number, count = 50, order = 'desc') {
  return apiFetch<any[]>(`/api/check-assets?type=${type}&start=${start}&count=${count}&order=${order}`);
}
