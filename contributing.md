# 贡献指南

本项目是一个在 **Cloudflare Workers / 阿里云 ESA / 腾讯云 EdgeOne** 上运行的通用 DDNS 代理。以下内容基于 `index.js` 的实现整理，便于贡献者快速理解代码结构和行为。

## 代码结构速览
- `export default { fetch }`：边缘函数入口，完成参数解析、厂商识别、缓存检查和结果返回。
- `createDDNSResponse`：根据 DynDNS / EasyDNS 协议格式返回对应的 HTTP 状态码和响应体。
- `extractParams`：支持 Basic Auth 与查询参数（`user|username`、`pass|password`、`hostname|domain|host_id|host|id`、`myip|ip|addr`），并从多种头部取回访 IP。
- `detectProvider`：按凭据模式推断厂商（阿里云 AccessKey、腾讯云 AKID/数字 ID、Cloudflare Token），否则回退到 `defaultProvider` 或 `CONFIG.DEFAULT_PROVIDER`。
- `handleAliyun / handleTencent / handleCloudflare`：分别调用对应 DNS API，按 A/AAAA 类型创建或更新记录。
- `CONFIG.CACHE_TTL`：成功时将 IP 写入 `DDNS_KV`，5 分钟内重复请求直接返回 `skipped`。

## 行为与兼容性
- **状态归一**：处理结果会落在 `created`、`updated`、`skipped`、`SUCCESS`、`NO_CHANGE`、`AUTH_FAIL`、`BAD_INPUT`、`ERROR` 中，并映射到 DynDNS/EasyDNS 规范（如 `good <ip>`、`nochg <ip>`、`badauth`、`911` 等）。
- **IP 获取顺序**：`myip/ip/addr` 查询参数优先；缺失时依次尝试 `request.clientAddr`、`cf-connecting-ip`、`x-client-ip`、`x-forwarded-for`（首个值）、`x-real-ip`。
- **域名拆分**：`splitDomain` 将末两段视为主域，其余为 RR，默认 RR 为 `@`。
- **签名工具**：`signAndSendV3` 统一处理阿里云和腾讯云的 V3 签名，Cloudflare 直接使用 Bearer Token。

## 本地与线上验证
当前仓库未包含自动化测试与构建脚本，可通过下列方式人工验证：
```bash
# 模拟 DynDNS 请求（示例）
curl "https://<your-worker-url>/nic/update?hostname=example.com&myip=1.2.3.4" \
  -u "LTAIxxxxx:yourSecret"   # 阿里云 AccessKey:Secret
```
确认返回体与状态码符合期望（`good <ip>`、`nochg <ip>` 等）。

## 贡献建议
1. 新增厂商时遵循现有模式：添加 `handleXXX`，在 `CONFIG` 补充端点/版本信息，并更新 `detectProvider` 的识别逻辑。
2. 保持响应语义：仅返回既有的状态码和文案，确保 DynDNS / EasyDNS 客户端兼容。
3. 优先复用 `signAndSendV3` 或现有工具函数，减少重复实现。
4. 若增加新的查询参数或头部，请同步更新上文的参数说明，确保路由器可快速对接。
