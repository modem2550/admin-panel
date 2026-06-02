import { randomUUID } from 'node:crypto';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

import { dev } from '$app/environment';
import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	return await resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
	const errorId = randomUUID();
	const message = error instanceof Error ? error.message : 'Unknown error';

	if (!dev) {
		console.error(
			JSON.stringify({
				errorId,
				path: event.url.pathname,
				name: error instanceof Error ? error.name : typeof error,
				message
			})
		);
		return {
			message: `Something went wrong. Reference: ${errorId}`
		};
	}

	console.error(`[${errorId}] ${event.url.pathname}:`, error);
	return {
		message: `${message} (ref: ${errorId})`
	};
};
