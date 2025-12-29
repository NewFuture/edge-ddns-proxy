# edge-ddns-proxy

> 让传统路由器/光猫的 DDNS 功能支持现代 DNS 服务商

[English](README.en.md) | 简体中文

---

## 📋 概述

**edge-ddns-proxy** 是一个运行在边缘计算平台（阿里云、腾讯云、Cloudflare）上的无服务器中间代理服务。它在路由器/光猫使用的传统 DDNS 协议与现代 DNS 服务商 API 之间架起桥梁，使老旧设备能够在现代 DNS 管理平台上更新 DNS 记录，无需更换现有设备。

### 💡 核心价值

- 🔌 **无需更换设备**：让现有路由器/光猫直接支持现代 DNS 服务商
- ⚡ **边缘计算**：利用边缘节点就近处理，响应迅速
- 💰 **零成本运行**：基于无服务器架构，按需计费
- 🔒 **安全可靠**：API 密钥安全存储，仅更新指定域名

### 🔄 工作原理

```
       ┌─────────────────────┐
       │    光猫/路由器       │
       │    内置 DDNS 客户端  │
       └─────────────────────┘
                 │
            传统 DDNS 协议
       (DynDNS/no-ip/EasyDNS/qdns等)
                 │
                 ▼
       ┌─────────────────────┐
       │  edge-ddns-proxy    │
       │     (边缘函数)       │
       │     协议转换层       │
       └─────────────────────┘
                 │
       现代 DNS 服务商 API
                 │
                 ▼
       ┌─────────────────────┐
       │     DNS 服务商      │
       │   - Cloudflare      │
       │   - 阿里云 DNS       │
       │   - 腾讯云 DNS       │
       │   - 其他服务商       │
       └─────────────────────┘
```
### 🎯 使用场景

此解决方案适用于以下场景：

1. ✅ 您的路由器/光猫仅支持传统 DDNS 协议（DynDNS、no-ip 等）
2. ✅ 您的域名使用现代 DNS 服务商（Cloudflare、阿里云 DNS、腾讯云 DNS 等）管理

#### 📡 支持的 DDNS 协议

- **DynDNS** - 经典动态 DNS 协议
- - **oray (花生壳)** - 国内DDNS服务商
- **no-ip** - No-IP DDNS 协议
- **EasyDNS** - EasyDNS 更新协议
- **qdns** - QDNS 协议及类似服务


#### ☁️ 支持 DNS 云厂商
- Cloudflare
- 阿里云 DNS (AccessKey)
- 腾讯云 DNS (DNSPod Accesskey)


### 🚀 快速开始

#### 前置条件

- 支持传统 DDNS 功能的路由器或光猫设备
- 域名托管在阿里云，腾讯云，或者 Cloudflare DNS 服务商的 API 访问权限

#### 基本配置步骤

- 配置 DNS 服务商的 API 凭证（AccessKey、SecretKey 等）
- 记录代理服务的访问 URL

#### 📝 配置示例

路由器 DDNS 设置：
```
服务提供商：DynDNS 系列，或者 no-ip、EasyDNS 均可
DDNS 服务器：your-proxy.edge-platform.com
用户名：your-key
密码：your-api-token
主机名：yourdomain.com
```

### 🔒 安全性说明

⚠️ **重要提示**：

- 传统路由器的 DDNS 协议大多使用 **HTTP 明文传输**（非 HTTPS），在光猫/路由器到边缘节点的链路上存在被截获的理论风险
- 建议使用 **最小权限原则** 配置 API 密钥，仅授予 DNS 记录更新权限
- 代理服务应设置访问控制，避免未授权访问
- 定期检查和更新 API 凭证

### 📚 技术细节

**数据流转过程：**

1. 📡 路由器检测到公网 IP 变化，发送标准 DDNS 更新请求（HTTP GET/POST）
2. 🔄 edge-ddns-proxy 接收并解析传统 DDNS 协议请求
3. 🔍 代理提取关键信息：IP 地址、主机名、认证信息
4. ✅ 验证请求合法性并提取目标域名
5. 🌐 调用对应 DNS 服务商的现代 API 接口更新记录
6. ✔️ 将更新结果转换为标准 DDNS 响应返回给路由器

**支持的边缘计算平台：**
- [阿里云ESA](https://common-buy.aliyun.com/?commodityCode=dcdn_dcdnserviceplan_public_cn&orderType=RENEW&instanceId=esa-site-b1da082k62v4)
- [腾讯云EdgeOne](https://edgeone.cloud.tencent.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)

---

## 📄 开源协议

本项目采用 [Apache 协议](LICENSE) 开源。

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

## 📮 获取帮助

如有问题或需要帮助，请[提交 Issue](https://github.com/NewFuture/edge-ddns-proxy/issues)。
