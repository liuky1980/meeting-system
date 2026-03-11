# 外部访问配置指南

让会议系统可以从互联网访问（通过 liuky.net 域名）

## 当前状态

✅ **本地访问**: http://localhost:8088
⚠️ **外部访问**: 需要配置

## 快速方案（3 步）

### 方案 A：直接使用 IP 访问（最简单）

如果服务器有公网 IP 且防火墙已开放：

```
http://<服务器公网IP>:8088
```

**需要开放端口：**
- `8088` - 会议 UI
- `3000` - WebSocket 信令

---

### 方案 B：使用域名 + HTTPS（推荐）⭐

```
https://meeting.liuky.net
```

**步骤：**

#### 1️⃣ DNS 解析

在域名服务商处添加 A 记录：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| meeting | A | <服务器公网 IP> |

#### 2️⃣ 开放防火墙

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 3️⃣ 云服务器安全组

在云服务商控制台开放：
- **入站规则**: 80 (HTTP), 443 (HTTPS)

阿里云/腾讯云/AWS 等都需要配置。

#### 4️⃣ 安装 Nginx + SSL

```bash
cd /home/admin/.openclaw/workspace/meeting-system

# 安装依赖
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 运行配置脚本
./setup-external.sh
```

#### 5️⃣ 验证访问

```bash
# 本地测试
curl -I https://meeting.liuky.net

# 外部测试（用手机 4G 网络访问）
https://meeting.liuky.net
```

---

### 方案 C：内网穿透（临时测试）

使用 frp 或 ngrok 快速暴露服务：

#### 使用 frp

```bash
# frps.ini (服务器端)
[common]
bind_port = 7000

# frpc.ini (客户端)
[common]
server_addr = <frp 服务器 IP>
server_port = 7000

[meeting]
type = tcp
local_ip = 127.0.0.1
local_port = 8088
remote_port = 8088
```

访问：`http://<frp 服务器 IP>:8088`

---

## 完整配置后架构

```
互联网用户
    │
    ▼
┌─────────────────┐
│  Cloudflare/    │  ← DNS + CDN + WAF（可选）
│  域名解析        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Nginx          │  ← HTTPS 终止、反向代理
│  (443 → 8088)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Docker         │
│  meeting-client │  ← 会议 UI
│  (8088)         │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  meeting-       │  ← WebSocket 信令
│  signaling      │
│  (3000)         │
└─────────────────┘
```

---

## WebRTC 注意事项

WebRTC 需要特殊配置才能跨网络工作：

### 问题

- 局域网内：直接 P2P 连接 ✅
- 跨网络：需要 STUN/TURN 服务器 ⚠️

### 解决方案

#### 1. 配置 STUN 服务器

编辑 `client/public/webrtc.js`：

```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

#### 2. 部署 TURN 服务器（推荐）

```bash
# 安装 coturn
sudo apt install -y coturn

# 配置 /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
realm=liuky.net
server-name=turn.liuky.net
lt-cred-mech
user=meeting:your_password
```

更新 `webrtc.js`：

```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:turn.liuky.net',
    username: 'meeting',
    credential: 'your_password'
  }
]
```

---

## 安全建议

| 项目 | 建议 |
|---|---|
| **HTTPS** | 必须启用（Let's Encrypt 免费） |
| **防火墙** | 只开放必要端口 |
| **会议 ID** | 使用随机 ID，避免猜测 |
| **访问控制** | 可添加简单密码保护 |
| **日志** | 定期查看 access.log |

---

## 测试清单

- [ ] DNS 解析生效 (`ping meeting.liuky.net`)
- [ ] HTTPS 证书有效 (`curl -I https://meeting.liuky.net`)
- [ ] 本地访问正常
- [ ] 外部访问正常（用手机 4G 测试）
- [ ] WebSocket 连接正常
- [ ] 音视频通话正常
- [ ] 多人会议正常

---

## 常见问题

### Q: 外部访问显示连接超时？
**A:** 检查防火墙和云服务器安全组是否开放端口。

### Q: 能打开页面但无法连接信令服务器？
**A:** WebSocket 路径需要特殊配置，参考 nginx/meeting.conf。

### Q: 音视频无法连接？
**A:** 需要配置 STUN/TURN 服务器，参考上方 WebRTC 配置。

### Q: SSL 证书如何续期？
**A:** Certbot 自动配置了定时任务，会自动续期。

---

## 一键部署（完整版）

```bash
cd /home/admin/.openclaw/workspace/meeting-system

# 1. 启动会议系统
docker compose up -d

# 2. 配置外部访问
./setup-external.sh

# 3. 验证
curl -I https://meeting.liuky.net
```

---

**配置完成后访问地址**: https://meeting.liuky.net
