import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		status: 'online',
		service: 'admin-panel-api',
		endpoints: [
			'/api/downloader/search',
			'/api/downloader/get-vod',
			'/api/check-assets',
			'/api/assets/scan',
			'/api/assets/playback',
			'/api/assets/theater-archive',
			'/api/downloads'
		]
	});
};
