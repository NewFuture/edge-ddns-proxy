# TencentCloud TC3-HMAC-SHA256 Signature Fix

## Summary

Fixed a critical bug in the TencentCloud DNSPod API signature implementation where X-TC-* headers were incorrectly included in the canonical request signature, causing authentication failures.

## Issue Description

The problem was identified by comparing the implementation with the reference Python code from [NewFuture/DDNS](https://github.com/NewFuture/DDNS/blob/master/ddns/provider/tencentcloud.py).

### Root Cause

In the `signAndSendV3` function for TencentCloud API calls:

**Before (Incorrect):**
```javascript
// X-TC-* headers were added BEFORE signature calculation
const headers = { "host": host, "content-type": cType };
if (isTencent) Object.assign(headers, { 
    "x-tc-action": action, 
    "x-tc-version": version, 
    "x-tc-timestamp": ts.toString(), 
    "x-tc-region": CONFIG.tencent.region 
});

// These headers were then included in the canonical request signature
const keys = Object.keys(headers).map(k => k.toLowerCase())
    .filter(k => isTencent || k.startsWith('x-acs-') || k === 'host' || k === 'content-type')
    .sort();
```

The filter condition `isTencent || ...` meant that when `isTencent` was true, ALL headers (including X-TC-*) were included in the signature, which is incorrect according to the TC3-HMAC-SHA256 specification.

**After (Correct):**
```javascript
// Only host and content-type are used for signature calculation
const headers = { "host": host, "content-type": cType };

// For Aliyun, add signing headers before signature
if (!isTencent) {
    Object.assign(headers, { "x-acs-action": action, ... });
}

// Filter now explicitly checks for TencentCloud
const keys = Object.keys(headers).map(k => k.toLowerCase())
    .filter(k => isTencent ? (k === 'host' || k === 'content-type') : 
                  (k.startsWith('x-acs-') || k === 'host' || k === 'content-type'))
    .sort();

// ... compute signature ...

headers["Authorization"] = auth;

// X-TC-* headers are added AFTER authorization is computed
if (isTencent) {
    headers["X-TC-Action"] = action;
    headers["X-TC-Version"] = version;
    headers["X-TC-Timestamp"] = ts.toString();
    headers["X-TC-Region"] = CONFIG.tencent.region;
}
```

## Technical Details

### TC3-HMAC-SHA256 Specification Requirements

According to the TencentCloud API documentation and the reference Python implementation:

1. **Canonical Request**: Only `host` and `content-type` headers should be included in the canonical request for signature calculation
2. **SignedHeaders**: Should be `content-type;host` (alphabetically sorted)
3. **X-TC-* Headers**: Must be added to the HTTP request AFTER the `Authorization` header is computed

### Python Reference Implementation

From `ddns/provider/tencentcloud.py` lines 48-87:

```python
# 构建请求头,小写 腾讯云只签名特定头部
headers = {"content-type": self.content_type, "host": self.endpoint.split("://", 1)[1].strip("/")}

# ... signature calculation using only these headers ...

authorization = hmac_sha256_authorization(...)

# X-TC 更新签名之后方可添加 (X-TC can only be added after updating signature)
headers.update(
    {
        "X-TC-Action": action,
        "X-TC-Version": self.version_date,
        "X-TC-Timestamp": timestamp,
        "authorization": authorization,
    }
)
```

The comment explicitly states: "X-TC 更新签名之后方可添加" (X-TC headers can only be added after the signature is updated).

## Impact

### Before Fix
- API requests to TencentCloud DNSPod would fail with authentication errors
- The signature would be computed over headers that shouldn't be included
- SignedHeaders would incorrectly include: `content-type;host;x-tc-action;x-tc-region;x-tc-timestamp;x-tc-version`

### After Fix
- API requests now correctly authenticate with TencentCloud DNSPod
- Signature is computed only over `host` and `content-type` headers
- SignedHeaders correctly shows: `content-type;host`
- X-TC-* headers are properly included in the HTTP request but not in the signature

## Testing

Added comprehensive test suites:

1. **tencentcloud-signature.test.js**: Tests signature algorithm correctness
   - Verifies only host and content-type are in canonical headers
   - Tests TC3 key derivation chain
   - Validates credential scope format
   - Checks signing string format

2. **tencentcloud-bug-demonstration.test.js**: Integration tests
   - Demonstrates the fix for header ordering
   - Validates correct flow of signature generation
   - Ensures X-TC-* headers are added after authorization

All tests pass successfully.

## Security Considerations

This fix is critical for the security and functionality of the TencentCloud integration:

1. **Correctness**: The signature now matches the TC3-HMAC-SHA256 specification
2. **Compliance**: Aligns with TencentCloud's official API signature requirements
3. **Reliability**: Prevents authentication failures that would break DDNS functionality

## References

- [TencentCloud DNSPod API Documentation](https://cloud.tencent.com/document/api/1427)
- [TC3-HMAC-SHA256 Signature v3](https://cloud.tencent.com/document/api/1427/56187)
- [Reference Python Implementation](https://github.com/NewFuture/DDNS/blob/master/ddns/provider/tencentcloud.py)
