import { env } from '$env/dynamic/private';
import { getValidToken } from '$lib/bnk48.server';

const TICKET_HOST = 'https://ticket.bnk48.io';
const IAMTOKEN_HOST = 'https://iamtoken.app';

const DEVICE_ID = 'devi/8BFC4876-FA5B-5EDC-A460-9F6F3610C5A2';
const APP_VERSION = '1.58.0';
const APP_ID = 'BNK48_101';
const TICKET_API_KEY = 'UM4gogv6rM764J9IabmBrcMhoz2El1';
export const IAMTOKEN_API_KEY = 'imn2C1yF98tUDrSuth2rEeiMmlLvaizN';

const IAM_USER_AGENT =
	'Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 ' +
	'(KHTML, like Gecko) BNK48_101/1.58.0';

let cachedToken: string | null = null;
let tokenExpiryTime = 0;

function getPin(): string {
	const pin = env.BNK48_PIN ?? '315560';
	if (!pin) {
		throw new Error('BNK48_PIN env var is required for iAM48 auction/poll access');
	}
	return pin;
}

async function getTicketAuthBearer(): Promise<string> {
	if (env.BNK48_TICKET_AUTH_BEARER) {
		return env.BNK48_TICKET_AUTH_BEARER;
	}
	return getValidToken();
}

export function buildIamHeaders(accessToken: string): Record<string, string> {
	return {
		accept: 'application/json, text/plain, */*',
		authorization: `Bearer ${accessToken}`,
		'x-api-key': IAMTOKEN_API_KEY,
		'user-agent': IAM_USER_AGENT,
	};
}

/**
 * Auto-login flow:
 * 1) POST ticket.bnk48.io/token-x/access (PIN) -> tempToken
 * 2) POST iamtoken.app/api/auth/v1/user/getAccessToken -> access token
 */
export async function getValidAccessToken(fetchFn: typeof fetch = fetch): Promise<string> {
	const now = Date.now();
	if (cachedToken && tokenExpiryTime > now + 60_000) {
		return cachedToken;
	}

	const pin = getPin();
	const ticketAuthBearer = await getTicketAuthBearer();

	const ticketHeaders = {
		Authorization: `Bearer ${ticketAuthBearer}`,
		'BNK48-AppVersion': APP_VERSION,
		Accept: 'application/json',
		'BNK48-Device-Id': DEVICE_ID,
		'BNK48-App-Id': APP_ID,
		'X-API-Key': TICKET_API_KEY,
		'Accept-Language': 'en-TH;q=1.0, th-TH;q=0.9',
		'Content-Type': 'application/json',
		'BNK48-Device-Model': 'iPadPro12Inch3',
		'User-Agent': 'iAM48/1.58.0 (app.bnk48official; build:716; iOS 26.5.0) Alamofire/4.9.1',
		Environment: 'Production',
	};

	const resp1 = await fetchFn(`${TICKET_HOST}/token-x/access`, {
		method: 'POST',
		headers: ticketHeaders,
		body: JSON.stringify({ pin }),
	});

	if (!resp1.ok) {
		const detail = await resp1.text().catch(() => '');
		throw new Error(
			`iAM48 PIN login failed: ${resp1.status} ${resp1.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`,
		);
	}

	const data1 = await resp1.json();
	const webUrl = data1.webUrl as string | undefined;
	if (!webUrl?.includes('token=')) {
		throw new Error('iAM48 PIN login returned an invalid webUrl');
	}

	const tempToken = webUrl.split('token=', 2)[1];

	const exchangeHeaders = {
		'content-type': 'application/json;charset=UTF-8',
		accept: 'application/json, text/plain, */*',
		'x-api-key': IAMTOKEN_API_KEY,
		origin: IAMTOKEN_HOST,
		'user-agent': IAM_USER_AGENT,
		referer: webUrl,
	};

	const resp2 = await fetchFn(`${IAMTOKEN_HOST}/api/auth/v1/user/getAccessToken`, {
		method: 'POST',
		headers: exchangeHeaders,
		body: JSON.stringify({ tempToken }),
	});

	if (!resp2.ok) {
		throw new Error(`iAM48 token exchange failed: ${resp2.status} ${resp2.statusText}`);
	}

	const data2 = await resp2.json();
	const accessToken = data2?.data?.token as string | undefined;
	if (!accessToken) {
		throw new Error('iAM48 token exchange returned no access token');
	}

	cachedToken = accessToken;
	if (data2.data.expiredTime) {
		const expiry = new Date(data2.data.expiredTime).getTime();
		tokenExpiryTime = Number.isNaN(expiry) ? now + 3_600_000 : expiry;
	} else {
		tokenExpiryTime = now + 3_600_000;
	}

	return accessToken;
}
