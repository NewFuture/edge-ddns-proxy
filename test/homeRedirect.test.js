import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../index.js';

test('redirects browser root request without params to docs', async () => {
    const request = new Request('https://example.com/', { headers: { accept: 'text/html' } });
    const response = await handler.fetch(request);

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://newfuture.github.io/edge-ddns-proxy');
});

test('does not redirect when params are provided', async () => {
    const request = new Request('https://example.com/?user=test', { headers: { accept: 'text/html' } });
    const response = await handler.fetch(request);

    assert.notEqual(response.status, 302);
    assert.equal(response.headers.get('location'), null);
});
