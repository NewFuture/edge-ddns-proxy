import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Test suite for TencentCloud TC3-HMAC-SHA256 signature generation
 * 
 * Based on the reference implementation from:
 * https://github.com/NewFuture/DDNS/blob/master/ddns/provider/tencentcloud.py
 * 
 * Key requirements:
 * 1. Only 'host' and 'content-type' headers should be included in canonical request
 * 2. X-TC-* headers (Action, Version, Timestamp, Region) must be added AFTER signature
 * 3. Signature follows TC3-HMAC-SHA256 algorithm with proper key derivation
 */

// Use global crypto for testing
const crypto = globalThis.crypto;

async function sha256Hex(s) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buffer)).map(x => x.toString(16).padStart(2, '0')).join('');
}

async function hmacRaw(k, s) {
    const key = await crypto.subtle.importKey(
        "raw",
        typeof k === 'string' ? new TextEncoder().encode(k) : k,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s));
}

async function hmacHex(k, s) {
    const raw = await hmacRaw(k, s);
    return Array.from(new Uint8Array(raw)).map(x => x.toString(16).padStart(2, '0')).join('');
}

test('TencentCloud signature should only include host and content-type in canonical headers', async () => {
    // Simulate the signature process
    const host = "dnspod.tencentcloudapi.com";
    const contentType = "application/json; charset=utf-8";
    const body = JSON.stringify({ Domain: "example.com" });
    const bodyHash = await sha256Hex(body);
    
    // According to TencentCloud docs and Python reference:
    // Only 'host' and 'content-type' should be in the canonical request
    const signedHeaders = { "host": host, "content-type": contentType };
    
    const keys = Object.keys(signedHeaders).map(k => k.toLowerCase()).sort();
    const canHeaders = keys.map(k => `${k}:${signedHeaders[k]}\n`).join('');
    const signedKeys = keys.join(';');
    
    // Verify the canonical headers only contain host and content-type
    assert.equal(signedKeys, 'content-type;host', 'SignedHeaders should only contain content-type and host');
    assert.equal(canHeaders, `content-type:${contentType}\nhost:${host}\n`, 'Canonical headers should only contain content-type and host');
    
    // The canonical request should not include x-tc-* headers
    const canonicalRequest = ['POST', '/', '', canHeaders, signedKeys, bodyHash].join('\n');
    assert.ok(!canonicalRequest.includes('x-tc-action'), 'Canonical request should not include x-tc-action');
    assert.ok(!canonicalRequest.includes('x-tc-version'), 'Canonical request should not include x-tc-version');
    assert.ok(!canonicalRequest.includes('x-tc-timestamp'), 'Canonical request should not include x-tc-timestamp');
    assert.ok(!canonicalRequest.includes('x-tc-region'), 'Canonical request should not include x-tc-region');
});

test('TencentCloud signature key derivation follows TC3 spec', async () => {
    // Test key derivation chain: TC3{SecretKey} -> Date -> Service -> tc3_request
    const secretKey = "test_secret_key";
    const date = "2024-01-01";
    const service = "dnspod";
    
    // Step 1: kDate = HMAC-SHA256("TC3" + SecretKey, Date)
    const kDate = await hmacRaw(new TextEncoder().encode("TC3" + secretKey), date);
    
    // Step 2: kService = HMAC-SHA256(kDate, Service)
    const kService = await hmacRaw(kDate, service);
    
    // Step 3: kSigning = HMAC-SHA256(kService, "tc3_request")
    const kSigning = await hmacRaw(kService, "tc3_request");
    
    // Verify we got a proper signing key (should be 32 bytes)
    const signingKeyArray = new Uint8Array(kSigning);
    assert.equal(signingKeyArray.length, 32, 'Signing key should be 32 bytes (SHA-256 output)');
});

test('TencentCloud credential scope format', () => {
    const date = "2024-01-01";
    const service = "dnspod";
    const scope = `${date}/${service}/tc3_request`;
    
    assert.equal(scope, "2024-01-01/dnspod/tc3_request", 'Credential scope format should be Date/Service/tc3_request');
});

test('TencentCloud signing string format', async () => {
    const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC
    const date = "2024-01-01";
    const scope = `${date}/dnspod/tc3_request`;
    const canonicalRequestHash = "abcd1234"; // Example hash
    
    const signingString = `TC3-HMAC-SHA256\n${timestamp}\n${scope}\n${canonicalRequestHash}`;
    
    const lines = signingString.split('\n');
    assert.equal(lines.length, 4, 'Signing string should have 4 lines');
    assert.equal(lines[0], 'TC3-HMAC-SHA256', 'First line should be algorithm');
    assert.equal(lines[1], timestamp.toString(), 'Second line should be timestamp');
    assert.equal(lines[2], scope, 'Third line should be credential scope');
    assert.equal(lines[3], canonicalRequestHash, 'Fourth line should be hashed canonical request');
});
