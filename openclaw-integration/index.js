/**
 * OpenClaw 会议集成模块
 * 
 * 功能：
 * - WebSocket 直连会议信令服务器
 * - 飞书命令控制会议
 * - AI 作为虚拟参与者实时聊天
 */

import { io } from 'socket.io-client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class MeetingIntegration {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.aiName = process.env.AI_NAME || 'Marvin 🤖';
    this.signalingUrl = process.env.SIGNALLING_URL || 'http://localhost:3000';
    this.feishuAppId = process.env.FEISHU_APP_ID;
    this.feishuAppSecret = process.env.FEISHU_APP_SECRET;
    this.clientUrl = process.env.CLIENT_URL || 'http://localhost:8088';
    this.tenantToken = null;
    this.tokenExpiry = null;
  }

  // ========== 飞书认证 ==========

  async getFeishuToken() {
    if (this.tenantToken && this.tokenExpiry > Date.now()) {
      return this.tenantToken;
    }

    try {
      const res = await axios.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        {
          app_id: this.feishuAppId,
          app_secret: this.feishuAppSecret
        }
      );
      
      this.tenantToken = res.data.tenant_access_token;
      this.tokenExpiry = Date.now() + (res.data.expire_in - 300) * 1000;
      
      console.log('✅ 飞书 Token 获取成功');
      return this.tenantToken;
    } catch (error) {
      console.error('❌ 飞书 Token 获取失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // ========== 飞书消息发送 ==========

  async sendFeishuMessage(chatId, content, msgType = 'text') {
    try {
      const token = await this.getFeishuToken();
      
      await axios.post(
        'https://open.feishu.cn/open-apis/im/v1/messages',
        {
          receive_id: chatId,
          msg_type: msgType,
          content: typeof content === 'string' ? JSON.stringify({ text: content }) : JSON.stringify(content)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: { receive_id_type: 'chat_id' }
        }
      );
      
      console.log('📨 飞书消息已发送');
    } catch (error) {
      console.error('❌ 飞书消息发送失败:', error.response?.data || error.message);
    }
  }

  async sendFeishuCard(chatId, card) {
    return this.sendFeishuMessage(chatId, card, 'interactive');
  }

  // ========== 会议信令连接 ==========

  async joinMeeting(roomId, name = this.aiName) {
    return new Promise((resolve, reject) => {
      this.socket = io(this.signalingUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('🔌 已连接到信令服务器');
        
        this.socket.emit('join-room', {
          roomId,
          name,
          media: { audio: false, video: false } // AI 不需要音视频
        });
      });

      this.socket.on('room-joined', (data) => {
        console.log('✅ 已加入会议室:', roomId);
        this.currentRoom = roomId;
        resolve({ success: true, roomId, participants: data.peers });
      });

      this.socket.on('user-joined', (data) => {
        console.log('👤 新用户加入:', data.name);
        this.handleUserJoined(data);
      });

      this.socket.on('user-left', (data) => {
        console.log('👋 用户离开:', data.name);
        this.handleUserLeft(data);
      });

      this.socket.on('chat-message', (data) => {
        console.log('💬 收到消息:', data);
        this.handleChatMessage(data);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ 连接错误:', error.message);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 已断开会话');
        this.currentRoom = null;
      });

      // 超时处理
      setTimeout(() => {
        if (this.socket?.connected) {
          resolve({ success: true, roomId, participants: [] });
        } else {
          reject(new Error('连接超时'));
        }
      }, 10000);
    });
  }

  // ========== 消息处理 ==========

  async sendMessage(message) {
    if (!this.socket || !this.currentRoom) {
      console.error('❌ 未连接到会议室');
      return false;
    }

    this.socket.emit('chat-message', {
      roomId: this.currentRoom,
      message,
      senderName: this.aiName
    });

    console.log('📤 已发送消息:', message);
    return true;
  }

  async leaveMeeting() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('leave-room', { roomId: this.currentRoom });
      this.socket.disconnect();
      console.log('👋 已离开会议室');
      this.currentRoom = null;
    }
  }

  // ========== 事件处理（可被子类重写） ==========

  async handleUserJoined(data) {
    // 默认：发送欢迎消息
    await this.sendMessage(`欢迎 ${data.name} 加入会议！👋`);
  }

  async handleUserLeft(data) {
    // 默认：发送告别消息
    await this.sendMessage(`${data.name} 离开了会议`);
  }

  async handleChatMessage(data) {
    // 默认：不自动回复，由上层处理
    console.log(`[${data.senderName}]: ${data.message}`);
  }

  // ========== 飞书命令处理 ==========

  async handleFeishuCommand(command, chatId, senderName) {
    const trimmed = command.trim();
    
    // 创建会议
    if (trimmed.startsWith('/会议 创建') || trimmed.startsWith('/meeting create')) {
      return this.createMeeting(chatId);
    }
    
    // 加入会议
    if (trimmed.startsWith('/会议 加入') || trimmed.startsWith('/meeting join')) {
      const roomId = trimmed.split(/\s+/)[2];
      if (roomId) {
        return this.joinMeetingCommand(chatId, roomId);
      }
    }
    
    // 帮助
    if (trimmed === '/help' || trimmed === '/帮助') {
      return this.sendHelp(chatId);
    }
    
    // 状态查询
    if (trimmed === '/会议 状态' || trimmed === '/meeting status') {
      return this.sendStatus(chatId);
    }

    return false;
  }

  async createMeeting(chatId) {
    const roomId = 'room-' + Math.random().toString(36).substring(2, 8);
    const meetingUrl = `${this.clientUrl}?room=${roomId}`;
    
    // 发送交互式卡片
    const card = {
      config: { wide_screen_mode: true },
      header: {
        template: 'blue',
        title: { tag: 'plain_text', content: '🎥 新会议已创建' }
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
              text: { tag: 'plain_text', content: '📹 加入会议' },
              url: meetingUrl,
              type: 'default'
            }
          ]
        }
      ]
    };

    await this.sendFeishuCard(chatId, card);
    console.log('✅ 会议已创建:', roomId);
    return true;
  }

  async joinMeetingCommand(chatId, roomId) {
    const meetingUrl = `${this.clientUrl}?room=${roomId}`;
    const content = `📹 点击加入会议：${meetingUrl}\n\n会议 ID: ${roomId}`;
    await this.sendFeishuMessage(chatId, content);
    console.log('📨 已发送会议链接:', roomId);
    return true;
  }

  async sendHelp(chatId) {
    const content = `📹 会议机器人命令：

/会议 创建 - 创建新会议
/会议 加入 <会议 ID> - 加入指定会议
/会议 状态 - 查看当前会议状态
/help - 显示帮助`;
    await this.sendFeishuMessage(chatId, content);
    return true;
  }

  async sendStatus(chatId) {
    const status = this.currentRoom 
      ? `✅ 已加入会议：${this.currentRoom}`
      : `⏸️ 未加入任何会议`;
    await this.sendFeishuMessage(chatId, status);
    return true;
  }
}

// ========== 导出单例 ==========
export const meetingIntegration = new MeetingIntegration();
export default MeetingIntegration;
