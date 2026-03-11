# 🎥 在线会议系统

一个基于 WebRTC 的本地部署在线会议系统，支持音视频通话、屏幕共享和即时消息。

## ✨ 功能特性

- **实时音视频通话** - 基于 WebRTC 的低延迟通信
- **屏幕共享** - 支持共享整个屏幕或应用窗口
- **即时消息** - 会议内聊天功能
- **参与者管理** - 实时显示参会者状态
- **本地部署** - 完全私有化部署，数据安全
- **飞书集成** - 可选的飞书机器人支持
- **AI 助手集成** - Marvin & Eve 实时参与会议 ⭐

## 📁 项目结构

```
meeting-system/
├── server/                 # 信令服务器 (Node.js + Socket.io)
│   ├── src/
│   │   └── index.js       # 服务器主逻辑
│   ├── package.json
│   └── Dockerfile
├── client/                 # 前端 UI (纯 HTML/JS)
│   ├── public/
│   │   ├── index.html     # 主页面
│   │   ├── styles.css     # 样式
│   │   ├── app.js         # 应用逻辑
│   │   └── webrtc.js      # WebRTC 管理
│   ├── package.json
│   └── Dockerfile
├── feishu-bot/            # 飞书机器人 (可选)
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── openclaw-integration/  # OpenClaw AI 集成模块 ⭐
│   ├── index.js           # 核心集成模块
│   ├── marvin-bot.js      # Marvin AI 助手
│   ├── eve-bot.js         # Eve AI 助手
│   ├── package.json
│   └── README.md
├── docker-compose.yml      # Docker 编排配置
├── .env.example           # 环境变量示例
└── README.md
```

## 🚀 快速开始

### 方式一：Docker Compose (推荐)

1. **克隆或进入项目目录**
   ```bash
   cd meeting-system
   ```

2. **启动服务**
   ```bash
   # 启动基础服务（信令服务器 + 前端）
   docker-compose up -d
   
   # 如需飞书机器人集成
   docker-compose --profile feishu up -d
   ```

3. **访问会议系统**
   - 前端：http://localhost:8080
   - 信令服务器：http://localhost:3000
   - 飞书机器人：http://localhost:3001

4. **查看日志**
   ```bash
   docker-compose logs -f
   ```

### 方式二：本地开发

#### 启动信令服务器
```bash
cd server
npm install
npm start
# 运行在 http://localhost:3000
```

#### 启动前端
```bash
cd client
npm install
npm start
# 运行在 http://localhost:8080
```

#### 启动飞书机器人 (可选)
```bash
cd feishu-bot
npm install
# 配置 .env 文件
npm start
# 运行在 http://localhost:3001
```

## ⚙️ 配置说明

### 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 飞书机器人配置 (可选)
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxx

# 客户端 URL (用于 CORS)
CLIENT_URL=http://localhost:8080

# 服务器端口
PORT=3000
```

### 飞书机器人配置

1. 在 [飞书开放平台](https://open.feishu.cn/) 创建应用
2. 获取 App ID 和 App Secret
3. 配置事件订阅：
   - 消息接收地址：`http://your-domain:3001/webhook/message`
   - 事件接收地址：`http://your-domain:3001/webhook/event`
4. 订阅所需权限：
   - 机器人
   - 消息
   - 群组

## 📖 使用说明

### 创建/加入会议

1. 访问 http://localhost:8088
2. 输入您的姓名
3. 输入或生成会议 ID
4. 选择是否启用摄像头和麦克风
5. 点击"加入会议"

### 会议中功能

- **静音/取消静音** - 控制麦克风
- **开启/关闭视频** - 控制摄像头
- **屏幕共享** - 共享您的屏幕
- **聊天** - 发送文字消息
- **参与者列表** - 查看在线用户

### 飞书机器人命令

- `/会议 创建` - 创建新会议
- `/会议 加入 <会议 ID>` - 加入指定会议
- `/help` - 显示帮助

### 🤖 AI 助手加入会议

Marvin 和 Eve 可以作为虚拟参与者加入会议：

```bash
# Marvin 加入
cd openclaw-integration
node marvin-bot.js join <room-id>

# Eve 加入
node eve-bot.js join <room-id>

# 双 AI 同时加入（两个终端）
node marvin-bot.js join room-123 &
node eve-bot.js join room-123 &
```

AI 会自动：
- 欢迎新用户加入
- 响应用户消息（你好、谢谢、再见等）
- 发送告别消息

---

AI 回复示例：
```
用户：你好
Marvin: 你好！👋
Eve: 你好呀～ 😊

用户：再见
Marvin: 再见！👋
Eve: 再见啦～ 路上小心
```

## 🔧 技术栈

- **后端**: Node.js, Express, Socket.io
- **前端**: 原生 HTML/CSS/JavaScript, WebRTC API
- **通信**: WebSocket (信令), WebRTC (P2P 媒体)
- **部署**: Docker, Docker Compose

## 🌐 网络要求

### 本地网络
- 所有设备在同一局域网内可直接通信

### 跨网络访问
如需支持跨网络访问，需要配置 TURN 服务器：

1. 部署 coturn 或其他 TURN 服务器
2. 在 `client/public/webrtc.js` 中添加 TURN 配置：
   ```javascript
   iceServers: [
     { urls: 'stun:stun.l.google.com:19302' },
     {
       urls: 'turn:your-turn-server.com',
       username: 'your-username',
       credential: 'your-password'
     }
   ]
   ```

## 🔒 安全考虑

- 所有通信在本地网络进行
- 支持 HTTPS 部署（生产环境推荐）
- 会议 ID 随机生成，难以猜测
- 无持久化存储，会议结束后数据清除

## 🛠️ 开发指南

### 添加新功能

1. **信令服务器**: 在 `server/src/index.js` 添加新的 Socket.io 事件
2. **前端**: 在 `client/public/app.js` 添加对应的处理逻辑
3. **样式**: 在 `client/public/styles.css` 添加样式

### 调试技巧

```bash
# 查看详细日志
docker-compose logs -f signaling
docker-compose logs -f client

# 进入容器调试
docker-compose exec signaling sh
docker-compose exec client sh
```

## 📝 API 端点

### 信令服务器

- `GET /health` - 健康检查
- `GET /api/rooms/:roomId` - 获取房间信息
- `WebSocket /` - Socket.io 连接

### 飞书机器人

- `POST /webhook/event` - 事件接收
- `POST /webhook/message` - 消息接收

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**问题反馈**: 如有问题请查看日志或提交 Issue。
