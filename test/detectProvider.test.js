import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectProvider, normalizeTencentCredential } from '../index.js';

const akidPrefix = 'AKID';
const compactId = '12345678901234567890123456789012'; // 32 chars
const compactKey = 'abcdefghijklmnopqrstuvwx12345678'; // 32 chars
const fullAkId = `${akidPrefix}${compactId}`;

test('does not detect tencent when id is only numeric', () => {
    const provider = detectProvider('123456', 'abc123token');
    assert.equal(provider, null);
});

test('detects tencent provider with full AKID prefix', () => {
    const provider = detectProvider(fullAkId, compactKey);
    assert.equal(provider, 'tencent');
});

test('detects tencent provider and auto-completes compact credentials', () => {
    const provider = detectProvider(compactId, compactKey);
    assert.equal(provider, 'tencent');

    const normalized = normalizeTencentCredential(compactId, compactKey);
    assert.equal(normalized.id, fullAkId);
    assert.equal(normalized.key, compactKey);
});

test('detects cloudflare only with allowed account placeholders', () => {
    assert.equal(detectProvider('cf', 'a'.repeat(30)), 'cloudflare');
    assert.equal(detectProvider('cloudflare', 'a'.repeat(30)), 'cloudflare');
    assert.equal(detectProvider('', 'a'.repeat(30)), 'cloudflare');
    assert.equal(detectProvider('wrong', 'a'.repeat(30)), null);
});
