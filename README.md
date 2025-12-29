# edge-ddns-proxy

> 让传统路由器/光猫的 DDNS 功能支持现代 DNS 服务商

[![License](https://img.shields.io/github/license/NewFuture/edge-ddns-proxy)](LICENSE)

[English](README.en.md) | 简体中文

---

## 📋 概述

**edge-ddns-proxy** 是一个运行在边缘计算平台（阿里云、腾讯云、Cloudflare）上的无服务器中间代理服务。它在路由器/光猫使用的传统 DDNS 协议与现代 DNS 服务商 API 之间架起桥梁，使老旧设备能够在现代 DNS 管理平台上更新 DNS 记录。

### 💡 核心价值

- 🔌 **无需更换设备**：让现有路由器/光猫直接支持现代 DNS 服务商
- ⚡ **边缘计算**：利用边缘节点就近处理，响应迅速
- 💰 **零成本运行**：基于无服务器架构，按需计费
- 🔒 **安全可靠**：API 密钥安全存储，仅更新指定域名

### 🔄 工作原理

```
       ┌─────────────────────┐
       │    光猫/路由器        │
       │   (Router/ONT)      │
       │    DDNS 客户端       │
       └─────────────────────┘
                 │
                 │ 传统 DDNS 协议
                 │ (DynDNS/no-ip/
                 │  EasyDNS/qdns等)
                 │
                 ▼
       ┌─────────────────────┐
       │  edge-ddns-proxy    │
       │     (边缘函数)       │
       │     协议转换层       │
       └─────────────────────┘
                 │
                 │ 现代 DNS 服务商 API
                 │ (RESTful/GraphQL)
                 │
                 ▼
       ┌─────────────────────┐
       │     DNS 服务商       │
       │   - Cloudflare      │
       │   - 阿里云 DNS       │
       │   - 腾讯云 DNS       │
       │   - 其他服务商       │
       └─────────────────────┘
```

### 📡 支持的 DDNS 协议

- ✅ **DynDNS** - 经典动态 DNS 协议
- ✅ **no-ip** - No-IP DDNS 协议
- ✅ **EasyDNS** - EasyDNS 更新协议
- ✅ **qdns** - QDNS 协议及类似服务
- ⚠️ **oray (花生壳)** - 部分支持

### 🎯 使用场景

此解决方案适用于以下场景：

1. ✅ 您的路由器/光猫仅支持传统 DDNS 协议（DynDNS、no-ip 等）
2. ✅ 您的域名使用现代 DNS 服务商（Cloudflare、阿里云 DNS、腾讯云 DNS 等）管理
3. ✅ 您无法在设备上安装自定义固件或软件
4. ✅ 您需要自动更新动态公网 IP 地址到 DNS 解析记录

### 🚀 快速开始

#### 前置条件

- 支持 DDNS 功能的路由器或光猫设备
- 边缘计算平台账号（阿里云、腾讯云或 Cloudflare）
- DNS 服务商的 API 访问权限

#### 基本配置步骤

**第一步：部署代理服务**
- 将 edge-ddns-proxy 部署到边缘计算平台
- 配置 DNS 服务商的 API 凭证（AccessKey、SecretKey 等）
- 记录代理服务的访问 URL

**第二步：配置路由器**
- 登录路由器管理界面，找到 DDNS 设置
- 选择支持的协议（DynDNS、no-ip、EasyDNS 等）
- 将代理服务 URL 填入 DDNS 服务器地址
- 填入身份认证信息（用户名/密码）
- 设置要更新的完整域名（如 home.example.com）

**第三步：测试验证**
- 保存路由器配置并应用
- 等待路由器自动发起第一次 DDNS 更新
- 检查 DNS 服务商控制台，确认记录已正确更新

### 📝 配置示例

路由器 DDNS 设置：
```
服务提供商：DynDNS
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
- [阿里云函数计算 FC](https://www.aliyun.com/product/fc)
- [腾讯云云函数 SCF](https://cloud.tencent.com/product/scf)
- [Cloudflare Workers](https://workers.cloudflare.com/)

---

## 📄 开源协议

本项目采用 [MIT 协议](LICENSE) 开源。

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

## 📮 获取帮助

如有问题或需要帮助，请[提交 Issue](https://github.com/NewFuture/edge-ddns-proxy/issues)。
