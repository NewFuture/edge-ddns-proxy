import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../index.js';

test('tencent signing omits region header and uses TC3 signed headers', async () => {
    const originalFetch = global.fetch;
    const calls = [];

    global.fetch = async (url, options) => {
        calls.push({ url, options });
        const body = calls.length === 1 ? { Response: { RecordList: [] } } : { Response: {} };
        return new Response(JSON.stringify(body), { status: 200 });
    };

    try {
        const request = new Request('https://example.com/?hostname=test.example.com&ip=1.1.1.1&user=AKIDEXAMPLE123456789&password=secret');
        await handler.fetch(request);

        const firstHeaders = calls[0]?.options?.headers || {};
        assert.ok(!('x-tc-region' in firstHeaders));

        const auth = firstHeaders.Authorization || firstHeaders.authorization;
        assert.ok(auth && auth.includes('SignedHeaders=content-type;host;x-tc-action'));
    } finally {
        global.fetch = originalFetch;
    }
});
