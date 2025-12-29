# edge-ddns-proxy

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 📋 English Documentation

### Overview

**edge-ddns-proxy** is a serverless middleware proxy service that runs on edge computing platforms (Alibaba Cloud, Tencent Cloud, Cloudflare). It bridges traditional DDNS protocols used by routers/optical modems with modern DNS provider APIs, enabling legacy devices to update DNS records on contemporary DNS management platforms.

### 🔄 Architecture

![Architecture Diagram](docs/architecture.svg)

```
┌─────────────────┐      Traditional DDNS Protocol      ┌──────────────────┐
│   Router/ONT    │ ════════════════════════════════════>│ edge-ddns-proxy  │
│  (光猫/路由器)   │  (DynDNS/no-ip/EasyDNS/qdns/etc.)   │  (Edge Function) │
└─────────────────┘                                      └──────────────────┘
                                                                   │
                                                                   │ Modern DNS Provider API
                                                                   │
                                                                   v
                                                          ┌──────────────────┐
                                                          │  DNS Providers   │
                                                          │  - Cloudflare    │
                                                          │  - Alibaba Cloud │
                                                          │  - Tencent Cloud │
                                                          │  - Others        │
                                                          └──────────────────┘
```

### ✨ Features

- 🚀 **Serverless Deployment**: Runs on edge computing platforms with zero server maintenance
- 🔌 **Protocol Compatibility**: Supports legacy DDNS protocols that routers already use
- 🌐 **Modern DNS Integration**: Updates records via current DNS provider APIs
- ⚡ **Low Latency**: Edge computing ensures fast response times
- 💰 **Cost-Effective**: Pay-per-use serverless pricing model

### 📡 Supported DDNS Protocols

- ✅ **DynDNS** - Classic dynamic DNS protocol
- ✅ **no-ip** - No-IP DDNS protocol
- ✅ **EasyDNS** - EasyDNS update protocol
- ✅ **qdns** - QDNS protocol and similar services
- ⚠️ **oray (花生壳)** - Partial support

### 🎯 Use Cases

This solution is perfect for scenarios where:

1. Your router/optical modem only supports traditional DDNS protocols
2. You want to use modern DNS providers (Cloudflare, Alibaba Cloud DNS, etc.)
3. You can't install custom firmware on your network equipment
4. You need automatic dynamic IP updates without manual intervention

### 🛠️ How It Works

1. **Router Configuration**: Configure your router to use traditional DDNS (e.g., DynDNS, no-ip)
2. **Proxy Translation**: edge-ddns-proxy receives the DDNS update request
3. **API Update**: The proxy translates the request and updates your DNS record via the provider's API
4. **Confirmation**: Your router receives a standard DDNS protocol response

### 🚀 Quick Start

#### Prerequisites
- A router or optical modem with DDNS support
- Access to an edge computing platform (Alibaba Cloud, Tencent Cloud, or Cloudflare)
- DNS records managed by a supported provider

#### Basic Configuration Steps

1. **Deploy the Proxy**
   - Deploy edge-ddns-proxy to your chosen edge computing platform
   - Configure your DNS provider API credentials
   - Note the proxy service URL

2. **Configure Your Router**
   - Access your router's DDNS settings
   - Select a supported protocol (DynDNS, no-ip, etc.)
   - Enter the proxy service URL as the DDNS server
   - Add your authentication credentials
   - Set the domain name to update

3. **Test the Connection**
   - Save the router configuration
   - Wait for the first update cycle
   - Verify the DNS record was updated correctly

### 📝 Configuration Example

Router DDNS Settings:
```
Service Provider: DynDNS
DDNS Server: your-proxy.edge-platform.com
Username: your-username
Password: your-api-token
Hostname: yourdomain.com
```

### 🔒 Security

- Uses HTTPS for all communications
- API tokens/credentials are stored securely
- No sensitive data is logged
- Regular security updates via serverless platform

### 📚 Technical Details

**Protocol Flow:**
1. Router sends standard DDNS update (HTTP GET/POST)
2. Proxy authenticates the request
3. Proxy extracts IP address and hostname
4. Proxy calls DNS provider API to update the record
5. Proxy returns success/failure response to router

---

<a name="chinese"></a>
## 📋 中文文档

### 概述

**edge-ddns-proxy** 是一个运行在边缘计算平台（阿里云、腾讯云、Cloudflare）上的无服务器中间代理服务。它在路由器/光猫使用的传统 DDNS 协议与现代 DNS 服务商 API 之间架起桥梁，使老旧设备能够在现代 DNS 管理平台上更新 DNS 记录。

### 🔄 工作原理

![架构图](docs/architecture.svg)

```
┌─────────────────┐        传统 DDNS 协议              ┌──────────────────┐
│   光猫/路由器    │ ════════════════════════════════════>│ edge-ddns-proxy  │
│   (Router/ONT)  │  (DynDNS/no-ip/EasyDNS/qdns等)     │    (边缘函数)     │
└─────────────────┘                                      └──────────────────┘
                                                                   │
                                                                   │ 现代 DNS 服务商 API
                                                                   │
                                                                   v
                                                          ┌──────────────────┐
                                                          │   DNS 服务商     │
                                                          │  - Cloudflare    │
                                                          │  - 阿里云 DNS     │
                                                          │  - 腾讯云 DNS     │
                                                          │  - 其他服务商     │
                                                          └──────────────────┘
```

### ✨ 特性

- 🚀 **无服务器部署**：运行在边缘计算平台，零服务器维护
- 🔌 **协议兼容**：支持路由器已使用的传统 DDNS 协议
- 🌐 **现代 DNS 集成**：通过当前 DNS 服务商 API 更新记录
- ⚡ **低延迟**：边缘计算确保快速响应
- 💰 **成本效益**：按使用付费的无服务器定价模式

### 📡 支持的 DDNS 协议

- ✅ **DynDNS** - 经典动态 DNS 协议
- ✅ **no-ip** - No-IP DDNS 协议
- ✅ **EasyDNS** - EasyDNS 更新协议
- ✅ **qdns** - QDNS 协议及类似服务
- ⚠️ **oray (花生壳)** - 部分支持

### 🎯 使用场景

此解决方案适用于以下场景：

1. 您的路由器/光猫仅支持传统 DDNS 协议
2. 您希望使用现代 DNS 服务商（Cloudflare、阿里云 DNS 等）
3. 您无法在网络设备上安装自定义固件
4. 您需要自动动态 IP 更新而无需手动干预

### 🛠️ 工作流程

1. **路由器配置**：将路由器配置为使用传统 DDNS（如 DynDNS、no-ip）
2. **代理转换**：edge-ddns-proxy 接收 DDNS 更新请求
3. **API 更新**：代理转换请求并通过服务商 API 更新 DNS 记录
4. **确认反馈**：路由器收到标准 DDNS 协议响应

### 🚀 快速开始

#### 前置要求
- 支持 DDNS 的路由器或光猫
- 访问边缘计算平台（阿里云、腾讯云或 Cloudflare）
- 由支持的服务商管理的 DNS 记录

#### 基本配置步骤

1. **部署代理服务**
   - 将 edge-ddns-proxy 部署到您选择的边缘计算平台
   - 配置您的 DNS 服务商 API 凭证
   - 记录代理服务的 URL

2. **配置路由器**
   - 访问路由器的 DDNS 设置
   - 选择支持的协议（DynDNS、no-ip 等）
   - 将代理服务 URL 设为 DDNS 服务器地址
   - 添加您的认证凭证
   - 设置要更新的域名

3. **测试连接**
   - 保存路由器配置
   - 等待第一次更新周期
   - 验证 DNS 记录已正确更新

### 📝 配置示例

路由器 DDNS 设置：
```
服务提供商：DynDNS
DDNS 服务器：your-proxy.edge-platform.com
用户名：your-username
密码：your-api-token
主机名：yourdomain.com
```

### 🔒 安全性

- 所有通信使用 HTTPS
- API 令牌/凭证安全存储
- 不记录敏感数据
- 通过无服务器平台定期安全更新

### 📚 技术细节

**协议流程：**
1. 路由器发送标准 DDNS 更新请求（HTTP GET/POST）
2. 代理验证请求
3. 代理提取 IP 地址和主机名
4. 代理调用 DNS 服务商 API 更新记录
5. 代理向路由器返回成功/失败响应

---

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📮 Support

If you have questions or need help, please open an issue.
