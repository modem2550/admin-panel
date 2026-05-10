import type { RequestHandler } from './$types';

/** Admin panel — ไม่ให้ crawler index */
export const GET: RequestHandler = async () => {
	const body = ['User-agent: *', 'Disallow: /', ''].join('\n');
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
