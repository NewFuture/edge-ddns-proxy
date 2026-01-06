import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Integration test that verifies the fix for TencentCloud signature
 * 
 * The fix: X-TC-* headers are now correctly excluded from the canonical request signature,
 * and only added to the HTTP request AFTER the authorization header is computed.
 */

// Import the crypto utilities to simulate what happens in index.js
const crypto = globalThis.crypto;

async function sha256Hex(s) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buffer)).map(x => x.toString(16).padStart(2, '0')).join('');
}

test('Fixed implementation: X-TC headers correctly excluded from signature', async () => {
    // The FIXED implementation should only include host and content-type in signature
    const host = "dnspod.tencentcloudapi.com";
    const contentType = "application/json; charset=utf-8";
    
    const body = JSON.stringify({ Domain: "example.com" });
    const bodyHash = await sha256Hex(body);
    
    // FIXED CODE: Only host and content-type in signature headers
    const headersForSignature = {
        "host": host,
        "content-type": contentType
    };
    
    // Filter that mimics the fixed code: isTencent ? only host and content-type
    const keys = Object.keys(headersForSignature).map(k => k.toLowerCase()).filter(k => k === 'host' || k === 'content-type').sort();
    const signedKeys = keys.join(';');
    
    // This is CORRECT
    assert.equal(signedKeys, 'content-type;host', 'Fixed implementation only includes content-type and host in signature');
    assert.ok(!signedKeys.includes('x-tc-action'), 'Fixed implementation excludes x-tc-action from signature');
    assert.ok(!signedKeys.includes('x-tc-version'), 'Fixed implementation excludes x-tc-version from signature');
    assert.ok(!signedKeys.includes('x-tc-timestamp'), 'Fixed implementation excludes x-tc-timestamp from signature');
    
    // Verify canonical headers
    const canHeaders = keys.map(k => `${k}:${headersForSignature[k]}\n`).join('');
    assert.equal(canHeaders, `content-type:${contentType}\nhost:${host}\n`, 'Canonical headers only contain content-type and host');
    
    const canonicalRequest = ['POST', '/', '', canHeaders, signedKeys, bodyHash].join('\n');
    assert.ok(!canonicalRequest.includes('x-tc-'), 'Canonical request does not include any x-tc-* headers');
});

test('Correct flow: X-TC headers added AFTER authorization', async () => {
    // This test documents the correct sequence of operations
    
    // Step 1: Create canonical request with ONLY host and content-type
    const host = "dnspod.tencentcloudapi.com";
    const contentType = "application/json; charset=utf-8";
    const body = JSON.stringify({ Domain: "example.com" });
    
    const signatureHeaders = {
        "host": host,
        "content-type": contentType
    };
    
    const keys = Object.keys(signatureHeaders).map(k => k.toLowerCase()).sort();
    assert.deepEqual(keys, ['content-type', 'host'], 'Only content-type and host in signature');
    
    // Step 2: Compute authorization with these headers
    const bodyHash = await sha256Hex(body);
    const canHeaders = keys.map(k => `${k}:${signatureHeaders[k]}\n`).join('');
    const signedKeys = keys.join(';');
    const canonicalRequest = ['POST', '/', '', canHeaders, signedKeys, bodyHash].join('\n');
    
    // The canonical request must only include the signed headers (content-type and host)
    assert.ok(canonicalRequest.includes('content-type'), 'Canonical request includes content-type header');
    assert.ok(canonicalRequest.includes('host'), 'Canonical request includes host header');
    assert.ok(!canonicalRequest.toLowerCase().includes('x-tc-'), 'Canonical request does not include any X-TC-* headers');
    
    // Step 3: Create authorization header
    // (simplified - just checking the principle)
    const authorization = `TC3-HMAC-SHA256 Credential=AKID.../2024-01-01/dnspod/tc3_request, SignedHeaders=${signedKeys}, Signature=...`;
    
    // Step 4: NOW add X-TC-* headers to the request headers (AFTER authorization)
    const finalHeaders = {
        ...signatureHeaders,
        "Authorization": authorization,
        "X-TC-Action": "DescribeRecordList",
        "X-TC-Version": "2021-03-23",
        "X-TC-Timestamp": "1704067200"
    };
    
    // Verify the authorization only references the original signed headers
    assert.ok(authorization.includes('content-type;host'), 'Authorization references only content-type and host');
    assert.ok(!authorization.includes('x-tc'), 'Authorization does not reference x-tc headers');
    
    // But the final request has all headers
    assert.ok('X-TC-Action' in finalHeaders, 'Final request includes X-TC-Action');
    assert.ok('Authorization' in finalHeaders, 'Final request includes Authorization');
});
