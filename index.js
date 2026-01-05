/**
 * Universal DDNS Proxy Edge Function
 * Environment: Cloudflare Workers, Alibaba Cloud ESA, Tencent EdgeOne
 */

// ==========================================
// 1. 配置与常量
// ==========================================
const CONFIG = {
    // Endpoints
    ali: { endpoint: "https://alidns.aliyuncs.com", version: "2015-01-09" },
    tencent: { endpoint: "https://dnspod.tencentcloudapi.com", version: "2021-03-23" },
    cloudflare: { endpoint: "https://api.cloudflare.com/client/v4" },

    // Default provider fallback ('ali', 'tencent', 'cloudflare', or null)
    DEFAULT_PROVIDER: 'ali',

    // Cache (seconds)
    CACHE_TTL: 300,

    // Domain whitelist (comma separated suffix list, empty means allow all). env.ALLOWED_SUFFIX overrides this value.
    ALLOWED_SUFFIX: ''
};

// ==========================================
// 2. 主入口 (Entry Point)
// ==========================================
export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const accept = (request.headers.get('accept') || '').toLowerCase();
            if (url.pathname === '/' && url.search === '' && accept.includes('text/html')) {
                return Response.redirect('https://edge-ddns-proxy.newfuture.cc/', 302);
            }

            // 1. 提取参数
            const { username, password, domain, ip, defaultProvider } = await extractParams(request);

            // 2. 基础校验 (返回 400/401)
            if (!username && !password) return createDDNSResponse(request, 'AUTH_FAIL'); // 401
            if (!domain) return createDDNSResponse(request, 'BAD_INPUT'); // 400
            if (!ip) return createDDNSResponse(request, 'ERROR'); // 500 (IP检测失败)

            // 2.1 域名白名单校验（可选）
            const allowedSuffixString = env?.ALLOWED_SUFFIX ?? CONFIG.ALLOWED_SUFFIX;
            if (!isDomainAllowed(domain, allowedSuffixString)) {
                console.warn(`Domain ${domain} rejected by whitelist.`);
                return createDDNSResponse(request, 'NOHOST');
            }

            // 3. 识别厂商
            const provider = detectProvider(username, password) || defaultProvider || CONFIG.DEFAULT_PROVIDER;

            if (!provider) {
                return createDDNSResponse(request, 'AUTH_FAIL'); // 401
            }

            // 4. KV 缓存检查
            const cacheKey = `DDNS:${provider}:${domain}`;
            // 兼容 Cloudflare (env.KV) 和 ESA/EdgeOne (全局对象或 env)
            const kv = (env && env.DDNS_KV) ? env.DDNS_KV : null;

            if (kv) {
                try {
                    const cachedIp = await kv.get(cacheKey);
                    if (cachedIp === ip) {
                        return createDDNSResponse(request, 'skipped', ip); // 200
                    }
                } catch (e) { /* Ignore KV read errors */ }
            }

            // 5. 执行 API 调用
            let result = { status: 'ERROR' };
            try {
                switch (provider) {
                    case "ali":
                        result = await handleAliyun(username, password, domain, ip);
                        break;
                    case "tencent":
                        result = await handleTencent(username, password, domain, ip);
                        break;
                    case "cloudflare":
                        const token = password || username;
                        result = await handleCloudflare(null, token, domain, ip);
                        break;
                    default:
                        return createDDNSResponse(request, 'AUTH_FAIL'); // 401
                }
            } catch (e) {
                console.error(`API Error [${provider}]:`, e);
                const msg = (e.message || "").toLowerCase();

                // 区分 401 和 500
                if (msg.includes("invalidaccesskeyid") || msg.includes("authfailure") || msg.includes("unauthorized") || msg.includes("authentication error")) {
                    return createDDNSResponse(request, 'AUTH_FAIL');
                }
                return createDDNSResponse(request, 'ERROR');
            }

            // 6. 更新缓存 (仅成功时)
            const isSuccess = ['created', 'updated', 'skipped'].includes(result.status);
            if (isSuccess && kv) {
                try {
                    // 兼容 waitUntil 写法
                    const task = kv.put(cacheKey, ip, { expirationTtl: CONFIG.CACHE_TTL });
                    if (ctx && ctx.waitUntil) ctx.waitUntil(task);
                    else await task;
                } catch (e) { /* Ignore KV write errors */ }
            }

            // 7. 返回结果
            return createDDNSResponse(request, result.status, ip);

        } catch (e) {
            console.error("Critical Error:", e);
            return createDDNSResponse(request, 'ERROR'); // 500
        }
    }
};

// ==========================================
// 3. 响应生成 (HTTP Status Aware)
// ==========================================

export function createDDNSResponse(request, status, currentIp = '') {
    const url = new URL(request.url);
    // EasyDNS 协议判断
    const isEasyDNS = /\/dyn\/(generic|ez-ipupdate|tomato)\.php/.test(url.pathname);

    let statusCode;
    let body = '';

    // 状态归类
    const isSuccess = ['created', 'updated', 'SUCCESS'].includes(status);
    const isNoChange = ['skipped', 'NO_CHANGE'].includes(status);

    if (isEasyDNS) {
        // === EasyDNS Protocol ===
        if (isSuccess || isNoChange) {
            body = 'NOERROR\n';
            statusCode = 200;
        } else if (status === 'AUTH_FAIL') {
            body = 'NOACCESS\n';
            statusCode = 401;
        } else if (status === 'NOHOST') {
            body = 'NOHOST\n';
            statusCode = 400;
        } else if (status === 'BAD_INPUT') {
            body = 'ILLEGAL INPUT\n';
            statusCode = 400;
        } else {
            body = 'NOSERVICE\n';
            statusCode = 500;
        }
    } else {
        // === DynDNS Protocol ===
        if (isSuccess) {
            body = `good ${currentIp}`;
            statusCode = 200;
        } else if (isNoChange) {
            body = `nochg ${currentIp}`;
            statusCode = 200;
        } else if (status === 'AUTH_FAIL') {
            body = 'badauth';
            statusCode = 401;
        } else if (status === 'NOHOST') {
            body = 'nohost';
            statusCode = 400;
        } else if (status === 'BAD_INPUT') {
            body = 'badrequest';
            statusCode = 400;
        } else {
            body = '911';
            statusCode = 500;
        }
    }

    return new Response(body, {
        status: statusCode,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache'
        }
    });
}

// ==========================================
// 4. 参数提取与厂商识别
// ==========================================

export async function extractParams(request) {
    const url = new URL(request.url);
    const query = url.searchParams;
    const headers = request.headers;

    let username = '';
    let password = '';

    // Basic Auth
    const authHeader = headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Basic ')) {
        try {
            const decoded = atob(authHeader.split(' ')[1]);
            const parts = decoded.split(':');
            username = parts[0];
            password = parts.slice(1).join(':');
        } catch (e) {
            // Log Basic Auth parsing errors for easier debugging without exposing credentials
            console.error("Failed to parse Basic Auth header:", e);
        }
    }

    if (!username) username = query.get('user') || query.get('username') || '';
    if (!password) password = query.get('pass') || query.get('password') || '';

    const domain = query.get('hostname') || query.get('domain') || query.get('host_id') || query.get('host') || query.get('id') || '';

    // IP 优先级: Query > Headers
    let ip = query.get('myip') || query.get('ip') || query.get('addr');
    if (!ip) {
        ip = request.clientAddr ||
            headers.get('cf-connecting-ip') ||
            headers.get('x-client-ip') ||
            headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            headers.get('x-real-ip') ||
            '';
    }

    const defaultProvider = query.get('provider') || query.get('default_provider');
    return { username, password, domain, ip, defaultProvider };
}

export function detectProvider(id, key) {
    if (!id && !key) return null;
    if (/^LTAI[a-zA-Z0-9]{10,}/.test(id)) return "ali";
    if (/^AKID[a-zA-Z0-9]{10,}/.test(id) || /^\d{5,}$/.test(id)) return "tencent";
    if ((key && key.length >= 30) || (id && id.length >= 30)) return "cloudflare";
    return null;
}

/**
 * Checks whether a domain is allowed by a comma-separated suffix whitelist.
 *
 * Rules:
 * - Whitelist string is trimmed; empty means allow all.
 * - Suffix items are trimmed, lowercased, and leading dots removed.
 * - Exact domain match or subdomain (endsWith) of suffix passes.
 * - Invalid/blank suffix items are ignored; no warnings are logged.
 */
function isDomainAllowed(domain, allowedSuffixString) {
    const whitelistConfig = String(allowedSuffixString || '').trim();
    if (!whitelistConfig) return true;

    const suffixList = whitelistConfig.split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    const target = String(domain || '').toLowerCase();
    return suffixList.some(suffix => target === suffix || target.endsWith(suffix) ||`.${target}` === suffix);
}

// ==========================================
// 5. API 逻辑 (Aliyun / Tencent / Cloudflare)
// ==========================================

async function handleAliyun(id, key, domain, ip) {
    const { rr, domain: domainName } = splitDomain(domain);
    const type = ip.includes(":") ? "AAAA" : "A";
    const call = (act, args) => signAndSendV3(CONFIG.ali.endpoint, CONFIG.ali.version, id, key, act, args, "ali");

    const query = await call("DescribeSubDomainRecords", { SubDomain: domain, Type: type });
    const current = (query.DomainRecords?.Record || []).find(r => r.Type === type);

    if (current) {
        if (current.Value === ip) return { status: "skipped" };
        await call("UpdateDomainRecord", { RecordId: current.RecordId, RR: rr, Type: type, Value: ip });
        return { status: "updated" };
    } else {
        await call("AddDomainRecord", { DomainName: domainName, RR: rr, Type: type, Value: ip });
        return { status: "created" };
    }
}

async function handleTencent(id, key, domain, ip) {
    const { rr, domain: domainName } = splitDomain(domain);
    const type = ip.includes(":") ? "AAAA" : "A";
    const call = (act, args) => signAndSendV3(CONFIG.tencent.endpoint, CONFIG.tencent.version, id, key, act, args, "tencent");

    const query = await call("DescribeRecordList", { Domain: domainName, Subdomain: rr, RecordType: type });
    const current = (query.Response?.RecordList || []).find(r => r.Type === type);

    if (current) {
        if (current.Value === ip) return { status: "skipped" };
        await call("ModifyRecord", { Domain: domainName, RecordId: current.RecordId, SubDomain: rr, RecordType: type, RecordLine: "默认", Value: ip });
        return { status: "updated" };
    } else {
        await call("CreateRecord", { Domain: domainName, SubDomain: rr, RecordType: type, RecordLine: "默认", Value: ip });
        return { status: "created" };
    }
}

async function handleCloudflare(id, token, domain, ip) {
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
    const { domain: domainName } = splitDomain(domain);

    let zoneId = id;
    if (!zoneId) {
        const zRes = await fetch(`${CONFIG.cloudflare.endpoint}/zones?name=${domainName}&status=active`, { headers }).then(r => r.json());
        if (!zRes.success || !zRes.result?.[0]) throw new Error("CF_ZONE_NOT_FOUND");
        zoneId = zRes.result[0].id;
    }

    const type = ip.includes(":") ? "AAAA" : "A";
    const rRes = await fetch(`${CONFIG.cloudflare.endpoint}/zones/${zoneId}/dns_records?type=${type}&name=${domain}`, { headers }).then(r => r.json());
    const current = rRes.result?.[0];

    if (current) {
        if (current.content === ip) return { status: "skipped" };
        await fetch(`${CONFIG.cloudflare.endpoint}/zones/${zoneId}/dns_records/${current.id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ type, name: domain, content: ip, ttl: 1, proxied: current.proxied })
        });
        return { status: "updated" };
    } else {
        await fetch(`${CONFIG.cloudflare.endpoint}/zones/${zoneId}/dns_records`, {
            method: "POST", headers,
            body: JSON.stringify({ type, name: domain, content: ip, ttl: 1, proxied: false })
        });
        return { status: "created" };
    }
}

// ==========================================
// 6. 通用签名与工具 (Crypto V3)
// ==========================================

// 常见的多级公共后缀（可按需扩展）
const MULTI_LEVEL_TLD_PARTS = [
    ["co", "uk"], ["org", "uk"], ["gov", "uk"], ["ac", "uk"],
    ["com", "cn"], ["net", "cn"], ["org", "cn"], ["gov", "cn"], ["ac", "cn"], ["edu", "cn"],
    ["com", "tw"], ["net", "tw"], ["org", "tw"], ["idv", "tw"], ["gov", "tw"], ["edu", "tw"],
    ["com", "hk"], ["net", "hk"], ["org", "hk"], ["edu", "hk"],
    ["com", "au"], ["net", "au"], ["org", "au"], ["gov", "au"], ["edu", "au"],
    ["co", "jp"], ["ne", "jp"], ["or", "jp"], ["ac", "jp"], ["go", "jp"]
];

const TENCENT_SIGNED_HEADERS = ["content-type", "host", "x-tc-action"];

export function splitDomain(full) {
    const cleaned = full.replace(/\.$/, '');
    const parts = cleaned.split('.').filter(Boolean);
    if (parts.length <= 2) return { rr: "@", domain: parts.join('.') };

    const lowerParts = parts.map(p => p.toLowerCase());

    let suffixLength = 1;
    for (const suffix of MULTI_LEVEL_TLD_PARTS) {
        if (suffix.length >= lowerParts.length) continue;
        const offset = lowerParts.length - suffix.length;
        const matched = suffix.every((label, idx) => lowerParts[offset + idx] === label);
        if (matched && suffix.length > suffixLength) suffixLength = suffix.length;
    }

    const domainParts = parts.slice(-(suffixLength + 1));
    const rrParts = parts.slice(0, -(suffixLength + 1));

    return {
        domain: domainParts.join('.'),
        rr: rrParts.length ? rrParts.join('.') : "@"
    };
}

async function signAndSendV3(endpoint, version, id, key, action, params, type) {
    const isTencent = type === "tencent";
    const host = new URL(endpoint).host;
    const method = "POST";

    let body, cType;
    if (isTencent) { body = JSON.stringify(params); cType = "application/json; charset=utf-8"; }
    else {
        const u = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value != null) {
                u.append(key, value);
            }
        });
        body = u.toString();
        cType = "application/x-www-form-urlencoded";
    }

    const d = new Date();
    const ts = Math.floor(d / 1000);
    const dateStr = d.toISOString().replace(/\.\d+Z$/, "Z");
    const dateDay = d.toISOString().split('T')[0];
    const nonce = Math.random().toString(36).slice(2);

    const bodyHash = await sha256Hex(body);
    const headers = { "host": host, "content-type": cType };
    if (isTencent) Object.assign(headers, { "x-tc-action": action, "x-tc-version": version, "x-tc-timestamp": ts.toString() });
    else Object.assign(headers, { "x-acs-action": action, "x-acs-version": version, "x-acs-date": dateStr, "x-acs-signature-nonce": nonce, "x-acs-content-sha256": bodyHash });

    const signedHeaderKeys = isTencent
        ? TENCENT_SIGNED_HEADERS.filter(k => k in headers)
        : Object.keys(headers).map(k => k.toLowerCase()).filter(k => k.startsWith('x-acs-') || k === 'host' || k === 'content-type').sort();
    const canHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('');
    const signedKeys = signedHeaderKeys.join(';');
    const canReq = [method, "/", "", canHeaders, signedKeys, bodyHash].join('\n');

    let auth;
    if (isTencent) {
        const scope = `${dateDay}/dnspod/tc3_request`;
        const strSign = `TC3-HMAC-SHA256\n${ts}\n${scope}\n${await sha256Hex(canReq)}`;
        const kDate = await hmacRaw(new TextEncoder().encode("TC3" + key), dateDay);
        const kSvc = await hmacRaw(kDate, "dnspod");
        const kReq = await hmacRaw(kSvc, "tc3_request");
        auth = `TC3-HMAC-SHA256 Credential=${id}/${scope}, SignedHeaders=${signedKeys}, Signature=${await hmacHex(kReq, strSign)}`;
    } else {
        const strSign = `ACS3-HMAC-SHA256\n${await sha256Hex(canReq)}`;
        auth = `ACS3-HMAC-SHA256 Credential=${id},SignedHeaders=${signedKeys},Signature=${await hmacHex(key, strSign)}`;
    }

    headers["Authorization"] = auth;
    const res = await fetch(endpoint, { method, headers, body });
    const json = await res.json();
    if (!res.ok || (isTencent && json.Response?.Error)) throw new Error(JSON.stringify(json));
    return json;
}

// Crypto Utils
async function sha256Hex(s) { return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); }
async function hmacRaw(k, s) {
    const key = await crypto.subtle.importKey("raw", typeof k === 'string' ? new TextEncoder().encode(k) : k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s));
}
async function hmacHex(k, s) { return toHex(await hmacRaw(k, s)); }
function toHex(b) { return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
