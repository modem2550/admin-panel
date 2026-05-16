import { json, error, type RequestEvent } from '@sveltejs/kit';
import { getTheaterArchive } from '$lib/bnk48.server';
import { proxyUrl } from '$lib/bnk48';

export const GET = async ({ url }: RequestEvent) => {
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
    if (isNaN(take) || take < 1 || take > 200) throw error(400, 'Invalid take parameter (1–200)');

    try {
        const result = await getTheaterArchive(skip, take);
        
        const assets = result.items.map((item: any) => {
            const rawDate: string = item.publishedAt ?? item.date ?? '';
            let dateStr = '';
            let timeStr = '';
            if (rawDate) {
                if (rawDate.includes('T')) {
                    const parts = rawDate.split('T');
                    dateStr = parts[0];
                    timeStr = parts[1].substring(0, 5); // HH:mm
                } else {
                    dateStr = rawDate;
                }
            }

            return {
                id: String(item.id ?? item.eventId ?? item.playbackId ?? item.contentId ?? '0'),
                url: proxyUrl(item.thumbnailImageUrl || item.imageFileUrl || item.thumbnailUrl || ''),
                title: item.title || 'Playback',
                description: item.description || item.detail || '',
                date: dateStr,
                time: item.time || timeStr,
                placeName: item.placeName || '',
                memberIdList: item.memberIdList || [],
                memberNames: item.memberNames || [],
            };
        });

        return json({
            items: assets,
            total: result.total,
            skip: result.skip,
            take: result.take
        }, {
            headers: { 'Cache-Control': 'no-store' }
        });

    } catch (e: any) {
        console.error('[PlaybackArchive] API error:', e);
        throw error(500, e.message || 'Internal Server Error');
    }
};
