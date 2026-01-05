import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../index.js';

const TEST_TENCENT_ID = 'AKIDEXAMPLEFAKE000000';
const TEST_TENCENT_KEY = 'dummysecret';
const TEST_DOMAIN = 'test.example.com';

test('tencent signing omits region header and uses TC3 signed headers', async () => {
    const originalFetch = global.fetch;
    const calls = [];

    global.fetch = async (url, options) => {
        calls.push({ url, options });
        const body = calls.length === 1 ? { Response: { RecordList: [] } } : { Response: {} };
        return new Response(JSON.stringify(body), { status: 200 });
    };

    try {
        const request = new Request(`https://example.com/?hostname=${TEST_DOMAIN}&ip=1.1.1.1&user=${TEST_TENCENT_ID}&password=${TEST_TENCENT_KEY}`);
        await handler.fetch(request);

        const firstHeaders = calls[0]?.options?.headers || {};
        const normalized = Object.fromEntries(Object.entries(firstHeaders).map(([k, v]) => [k.toLowerCase(), v]));
        assert.ok(!('x-tc-region' in normalized));

        const auth = normalized.authorization;
        assert.ok(auth && auth.includes('SignedHeaders=content-type;host;x-tc-action'));
    } finally {
        global.fetch = originalFetch;
    }
});
