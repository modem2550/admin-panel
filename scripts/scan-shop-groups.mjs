#!/usr/bin/env node
/**
 * Standalone shop group scanner — bypasses the web UI entirely.
 *
 * Logs into BNK48 directly, walks a range of product-group ids against the
 * shop detail API, and upserts results into Supabase `cdn_assets` — same
 * logic as the "Group" scan in the Scanner page, just runnable from the
 * terminal with one command (no dev server, no browser, no SCAN_SECRET).
 *
 * Usage (run from the project root, where .env lives):
 *   node scripts/scan-shop-groups.mjs <startId> <endId>
 *
 * Example — test a small range first:
 *   node scripts/scan-shop-groups.mjs 1100 1200
 *
 * Requires in .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * BNK48_EMAIL, BNK48_PASSWORD (all already present in this project's .env).
 */

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── Load .env manually (no extra dependency needed) ─────────────────────────
function loadEnv() {
    if (!existsSync('.env')) return;
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}
loadEnv();

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BNK48_EMAIL, BNK48_PASSWORD } = process.env;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}
if (!BNK48_EMAIL || !BNK48_PASSWORD) {
    console.error('Missing BNK48_EMAIL or BNK48_PASSWORD in .env');
    process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const AUTH_URL = 'https://user.bnk48.io/auth/email';
const SHOP_PRODUCT_DETAIL_URL = 'https://public.bnk48.io/shop/product/detail/';
const REQUEST_DELAY_MS = 150;

const DEFAULT_HEADERS = {
    Accept: 'application/json',
    'BNK48-AppVersion': '1.58.0',
    'BNK48-Device-Id': 'devi/8BFC4876-FA5B-5EDC-A460-9F6F3610C5A2',
    'BNK48-App-Id': 'BNK48_101',
    'Accept-Language': 'en-TH;q=1.0, th-TH;q=0.9',
    'Content-Type': 'application/json',
    'BNK48-Device-Model': 'iPadPro12Inch3',
    'User-Agent': 'iAM48/1.58.0 (app.bnk48official; build:716; iOS 26.5.0) Alamofire/4.9.1',
    Connection: 'keep-alive',
    Environment: 'Production',
    'x-api-key': 'UM4gogv6rM764J9IabmBrcMhoz2El1',
};

let token = null;

async function login() {
    const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'BNK48-Device-Id': 'null',
            'BNK48-AppCode': 'null',
            'BNK48-Device-Model': 'null',
        },
        body: JSON.stringify({ email: BNK48_EMAIL, password: BNK48_PASSWORD }),
    });
    if (!res.ok) throw new Error(`BNK48 login failed: ${res.status}`);
    const data = await res.json();
    return data.token;
}

async function fetchDetail(id) {
    const res = await fetch(`${SHOP_PRODUCT_DETAIL_URL}${id}`, {
        headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
    });
    if (res.status === 200) return await res.json();
    if (res.status === 401 || res.status === 403) return 'unauthorized';
    return null;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const [, , startArg, endArg] = process.argv;
    const startId = parseInt(startArg ?? '1', 10);
    const endId = parseInt(endArg ?? '2000', 10);

    if (Number.isNaN(startId) || Number.isNaN(endId) || startId > endId) {
        console.error('Usage: node scripts/scan-shop-groups.mjs <startId> <endId>');
        process.exit(1);
    }

    console.log(`Logging in as ${BNK48_EMAIL}...`);
    token = await login();
    console.log(`Logged in. Scanning group ids ${startId}-${endId}...\n`);

    let scanned = 0;
    let found = 0;

    for (let id = startId; id <= endId; id++) {
        let data = await fetchDetail(id);
        if (data === 'unauthorized') {
            token = await login();
            data = await fetchDetail(id);
        }
        scanned++;

        if (data && data !== 'unauthorized') {
            found++;
            const groupTitle = typeof data.title === 'string' ? data.title : '';
            const groupDescription = typeof data.description === 'string' ? data.description : '';
            const groupThumb = typeof data.thumbnailImageUrl === 'string'
                ? data.thumbnailImageUrl.replace('https://img.bnk48cdn.net/', '/api/img/')
                : '';
            const now = new Date().toISOString();

            await supabase.from('cdn_assets').upsert(
                [{
                    id,
                    type: 'group',
                    url: groupThumb,
                    title: groupTitle,
                    description: groupDescription,
                    skus: [1],
                    discovered_at: now,
                    last_seen: now,
                }],
                { onConflict: 'id,type' }
            );

            const variantRows = [];
            for (const v of Array.isArray(data.variants) ? data.variants : []) {
                if (typeof v?.productVariantId !== 'number') continue;
                const variantTitle = typeof v.variantTitle === 'string' ? v.variantTitle : '';
                const variantThumb = typeof v.thumbnailImageUrl === 'string'
                    ? v.thumbnailImageUrl.replace('https://img.bnk48cdn.net/', '/api/img/')
                    : '';
                variantRows.push({
                    id: v.productVariantId,
                    type: 'product',
                    url: variantThumb,
                    title: variantTitle ? `${groupTitle} ${variantTitle}`.trim() : groupTitle,
                    description: groupDescription,
                    skus: [1],
                    discovered_at: now,
                    last_seen: now,
                });
            }

            if (variantRows.length > 0) {
                await supabase.from('cdn_assets').upsert(variantRows, { onConflict: 'id,type' });
            }

            console.log(`[${id}] FOUND — "${groupTitle}" (+${variantRows.length} variants)`);
        } else {
            console.log(`[${id}] not found`);
        }

        await sleep(REQUEST_DELAY_MS);
    }

    console.log(`\nDone. Scanned ${scanned} ids, found ${found} groups.`);
}

main().catch((e) => {
    console.error('Scan failed:', e);
    process.exit(1);
});
