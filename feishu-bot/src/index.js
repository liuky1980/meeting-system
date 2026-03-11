import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const SIGNALLING_URL = process.env.SIGNALLING_URL || 'http://localhost:3000';

app.use(express.json());

// 飞书事件验证
app.post('/webhook/event', (req, res) => {
  const { challenge, token, type } = req.body;
  
  if (type === 'url_verification') {
    // URL 验证
    res.send(challenge);
    return;
  }
  
  // 处理事件
  handleFeishuEvent(req.body);
  res.send('ok');
});

// 飞书机器人消息
app.post('/webhook/message', async (req, res) => {
  const { challenge, token, type } = req.body;
  
  if (type === 'url_verification') {
    res.send(challenge);
    return;
  }
  
  await handleFeishuMessage(req.body);
  res.send('ok');
});

async function handleFeishuEvent(event) {
  console.log('收到飞书事件:', event.header?.event_type);
  
  // 可以处理各种飞书事件
  // 例如：用户加入群聊、消息撤回等
}

async function handleFeishuMessage(message) {
  const { header, event } = message;
  
  if (!event || !event.message) return;
  
  const msgType = event.message.message_type;
  const content = JSON.parse(event.message.content || '{}');
  const text = content.text || '';
  
  console.log(`收到消息 [${msgType}]:`, text);
  
  // 处理命令
  if (msgType === 'text') {
    await processCommand(text, event);
  }
}

async function processCommand(text, event) {
  const trimmed = text.trim();
  
  // 创建会议
  if (trimmed.startsWith('/meeting create') || trimmed.startsWith('/会议 创建')) {
    const roomId = generateRoomId();
    const meetingUrl = `${process.env.CLIENT_URL || 'http://localhost:8080'}?room=${roomId}`;
    
    await sendFeishuMessage(event.sender.sender_id.open_id, {
      msg_type: 'interactive',
      card: createMeetingCard(roomId, meetingUrl)
    });
  }
  
  // 加入会议
  if (trimmed.startsWith('/meeting join') || trimmed.startsWith('/会议 加入')) {
    const roomId = trimmed.split(/\s+/)[2];
    if (roomId) {
      const meetingUrl = `${process.env.CLIENT_URL || 'http://localhost:8080'}?room=${roomId}`;
      await sendFeishuMessage(event.sender.sender_id.open_id, {
        msg_type: 'text',
        content: { text: `点击加入会议：${meetingUrl}` }
      });
    }
  }
  
  // 帮助
  if (trimmed === '/help' || trimmed === '/帮助') {
    await sendFeishuMessage(event.sender.sender_id.open_id, {
      msg_type: 'text',
      content: {
        text: `📹 会议机器人命令：
/会议 创建 - 创建新会议
/会议 加入 <会议 ID> - 加入指定会议
/help - 显示帮助`
      }
    });
  }
}

function generateRoomId() {
  return 'room-' + Math.random().toString(36).substring(2, 8);
}

function createMeetingCard(roomId, meetingUrl) {
  return {
    config: {
      wide_screen_mode: true
    },
    header: {
      template: 'blue',
      title: {
        tag: 'plain_text',
        content: '🎥 新会议已创建'
      }
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**会议 ID**: ${roomId}\n**状态**: 等待参与者`
        }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📹 加入会议'
            },
            url: meetingUrl,
            type: 'default'
          },
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📋 复制会议 ID'
            },
            type: 'default'
          }
        ]
      }
    ]
  };
}

async function sendFeishuMessage(openId, message) {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    console.log('未配置飞书凭证，跳过发送');
    return;
  }
  
  try {
    // 获取 tenant_access_token
    const tokenRes = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      }
    );
    
    const tenantToken = tokenRes.data.tenant_access_token;
    
    // 发送消息
    await axios.post(
      'https://open.feishu.cn/open-apis/im/v1/messages',
      {
        receive_id: openId,
        msg_type: message.msg_type,
        content: JSON.stringify(message.content || message.card)
      },
      {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          receive_id_type: 'open_id'
        }
      }
    );
    
    console.log('消息已发送');
  } catch (error) {
    console.error('发送飞书消息失败:', error.response?.data || error.message);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 飞书机器人运行在 http://0.0.0.0:${PORT}`);
  console.log(`事件端点：/webhook/event`);
  console.log(`消息端点：/webhook/message`);
});
