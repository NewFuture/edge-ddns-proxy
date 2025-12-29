import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitDomain } from '../index.js';

test('returns root when there is no subdomain', () => {
    assert.deepEqual(splitDomain('example.com'), { rr: '@', domain: 'example.com' });
});

test('splits simple subdomain', () => {
    assert.deepEqual(splitDomain('www.example.com'), { rr: 'www', domain: 'example.com' });
});

test('keeps multi-level TLD as domain', () => {
    assert.deepEqual(splitDomain('example.co.uk'), { rr: '@', domain: 'example.co.uk' });
});

test('handles nested subdomains with multi-level TLD', () => {
    assert.deepEqual(splitDomain('test.www.example.co.uk'), { rr: 'test.www', domain: 'example.co.uk' });
});

test('ignores trailing dot and empty labels', () => {
    assert.deepEqual(splitDomain('..www.example.com.'), { rr: 'www', domain: 'example.com' });
});
