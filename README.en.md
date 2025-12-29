# edge-ddns-proxy

> Enable Modern DNS Providers for Traditional Router/ONT DDNS

[![License](https://img.shields.io/github/license/NewFuture/edge-ddns-proxy)](LICENSE)

English | [简体中文](README.md)

---

## 📋 Overview

**edge-ddns-proxy** is a serverless middleware proxy service running on edge computing platforms (Alibaba Cloud, Tencent Cloud, Cloudflare). It bridges traditional DDNS protocols used by routers/optical network terminals with modern DNS provider APIs, enabling legacy devices to update DNS records on contemporary DNS management platforms.

### 💡 Core Benefits

- 🔌 **No Device Replacement**: Enable existing routers/ONTs to work with modern DNS providers
- ⚡ **Edge Computing**: Leverage edge nodes for nearby processing and fast response
- 💰 **Zero-Cost Operation**: Serverless architecture with pay-as-you-go pricing
- 🔒 **Secure & Reliable**: Securely store API keys and update only specified domains

### 🔄 How It Works

```
       ┌─────────────────────┐
       │   Router / ONT      │
       │   DDNS Client       │
       └─────────────────────┘
                 │
       Traditional DDNS Protocol
   (DynDNS/no-ip/EasyDNS/qdns, etc.)
                 │
                 ▼
       ┌─────────────────────┐
       │  edge-ddns-proxy    │
       │  (Edge Function)    │
       │  Protocol Bridge    │
       └─────────────────────┘
                 │
       Modern DNS Provider API
                 │
                 ▼
       ┌─────────────────────┐
       │   DNS Providers     │
       │   - Cloudflare      │
       │   - Alibaba Cloud   │
       │   - Tencent Cloud   │
       │   - Others          │
       └─────────────────────┘
```

### 📡 Supported DDNS Protocols

- ✅ **DynDNS** - Classic dynamic DNS protocol
- ✅ **no-ip** - No-IP DDNS protocol
- ✅ **EasyDNS** - EasyDNS update protocol
- ✅ **qdns** - QDNS protocol and similar services
- ⚠️ **oray (花生壳)** - Partial support

### 🎯 Use Cases

This solution is perfect for scenarios where:

1. ✅ Your router/ONT only supports traditional DDNS protocols (DynDNS, no-ip, etc.)
2. ✅ Your domain is managed by modern DNS providers (Cloudflare, Alibaba Cloud DNS, Tencent Cloud DNS, etc.)
3. ✅ You cannot install custom firmware or software on your device
4. ✅ You need automatic updates of dynamic public IP addresses to DNS records

### 🚀 Quick Start

#### Prerequisites

- A router or ONT device with DDNS functionality
- An edge computing platform account (Alibaba Cloud, Tencent Cloud, or Cloudflare)
- API access to your DNS provider

#### Basic Configuration Steps

**Step 1: Deploy the Proxy Service**
- Deploy edge-ddns-proxy to your chosen edge computing platform
- Configure your DNS provider's API credentials (AccessKey, SecretKey, etc.)
- Note the proxy service access URL

**Step 2: Configure Your Router**
- Log into your router's management interface and find DDNS settings
- Select a supported protocol (DynDNS, no-ip, EasyDNS, etc.)
- Enter the proxy service URL as the DDNS server address
- Fill in authentication information (username/password)
- Set the fully qualified domain name to update (e.g., home.example.com)

**Step 3: Test and Verify**
- Save and apply the router configuration
- Wait for the router to automatically initiate the first DDNS update
- Check your DNS provider's console to confirm the record was updated correctly

### 📝 Configuration Example

Router DDNS Settings:
```
Service Provider: DynDNS
DDNS Server: your-proxy.edge-platform.com
Username: your-key
Password: your-api-token
Hostname: yourdomain.com
```

### 🔒 Security Considerations

⚠️ **Important Notes**:

- Traditional router DDNS protocols typically use **plain HTTP** (not HTTPS), posing a theoretical risk of interception on the ONT/router to edge node link
- Follow the **principle of least privilege** when configuring API keys, granting only DNS record update permissions
- Implement access controls on the proxy service to prevent unauthorized access
- Regularly review and rotate API credentials

### 📚 Technical Details

**Data Flow Process:**

1. 📡 Router detects public IP change and sends standard DDNS update request (HTTP GET/POST)
2. 🔄 edge-ddns-proxy receives and parses the traditional DDNS protocol request
3. 🔍 Proxy extracts key information: IP address, hostname, authentication credentials
4. ✅ Validates request legitimacy and extracts target domain
5. 🌐 Calls the corresponding DNS provider's modern API interface to update records
6. ✔️ Converts update results into standard DDNS response and returns to router

**Supported Edge Computing Platforms:**
- [Alibaba Cloud ESA](https://cn.aliyun.com/product/esa)
- [Tencent Cloud EdgeOne]https://edgeone.cloud.tencent.com/
- [Cloudflare Workers](https://workers.cloudflare.com/)

---

## 📄 License

This project is licensed under the [Apache License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📮 Support

If you have questions or need help, please [submit an issue](https://github.com/NewFuture/edge-ddns-proxy/issues).
