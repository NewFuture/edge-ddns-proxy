import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectProvider } from '../index.js';

test('detects tencent provider when id is numeric', () => {
    const provider = detectProvider('123456', 'abc123token');
    assert.equal(provider, 'tencent');
});
