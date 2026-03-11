# OpenClaw 会议集成模块

混合模式实现：飞书命令 + WebSocket 直连

## 架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  飞书机器人  │────▶│  信令服务器  │◀────│  会议 UI    │
│  (命令控制)  │     │  (Socket.io)│     │  (浏览器)   │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                       ▲
       │                                       │
       └────────── WebSocket ──────────────────┘
              (AI 实时聊天)
```

## 快速开始

### 1. 安装依赖

```bash
cd openclaw-integration
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入飞书配置（可选）
```

### 3. 启动 AI 助手

#### Marvin 加入会议
```bash
node marvin-bot.js join room-123
```

#### Eve 加入会议
```bash
node eve-bot.js join room-123
```

#### 发送单条消息
```bash
node marvin-bot.js say room-123 "大家好，我是 Marvin！"
```

#### 运行测试
```bash
node marvin-bot.js test
node eve-bot.js test
```

## 功能

### AI 自动回复

AI 会自动响应会议中的消息：

| 触发词 | 示例回复 |
|---|---|
| 你好/Hello | "你好！👋" |
| 你是谁 | "我是 Marvin，AI 会议助手 🤖" |
| 再见/Bye | "再见！👋" |
| 谢谢 | "不客气！😊" |
| 记录/纪要 | "好的，我会帮忙记录 📝" |

### 飞书命令

在飞书群里发送：

```
/会议 创建          → 创建新会议，返回链接
/会议 加入 room-123 → 加入指定会议
/会议 状态          → 查看 AI 当前状态
/help              → 显示帮助
```

### 编程接口

```javascript
import { meetingIntegration } from './index.js';

const bot = new meetingIntegration.constructor();

// 加入会议
await bot.joinMeeting('room-123');

// 发送消息
await bot.sendMessage('大家好！');

// 离开会议
await bot.leaveMeeting();
```

## 自定义 AI 行为

编辑 `marvin-bot.js` 或 `eve-bot.js`：

```javascript
// 添加新的回复规则
this.replyRules = [
  {
    trigger: /你的正则/,
    response: ['回复 1', '回复 2']
  }
];

// 重写事件处理
async handleUserJoined(data) {
  // 自定义欢迎逻辑
}

async handleChatMessage(data) {
  // 自定义消息处理
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| SIGNALLING_URL | 信令服务器地址 | http://localhost:3000 |
| CLIENT_URL | 客户端 URL | http://localhost:8088 |
| FEISHU_APP_ID | 飞书 App ID | - |
| FEISHU_APP_SECRET | 飞书 App Secret | - |
| AI_NAME | AI 显示名称 | Marvin 🤖 / Eve 🤖 |

## 双 AI 协同

Marvin 和 Eve 可以同时加入同一个会议：

```bash
# 终端 1
node marvin-bot.js join room-123

# 终端 2
node eve-bot.js join room-123
```

两个 AI 会：
- 各自独立响应用户消息
- 回复风格不同（Marvin 直接，Eve 温柔）
- 避免同时回复（Eve 延迟稍长）

## 注意事项

1. **避免刷屏** - AI 回复有延迟，且只响应特定关键词
2. **关闭自动回复** - 可以调用 `disableAutoReply()` 关闭
3. **飞书配置可选** - 不配置飞书时，仅 WebSocket 功能可用
4. **网络要求** - 需要能访问信令服务器

---

**问题反馈**: 查看日志或提交 Issue
