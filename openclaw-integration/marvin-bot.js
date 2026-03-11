/**
 * Marvin AI 会议助手
 * 
 * 基于 MeetingIntegration，实现智能回复和会议参与
 */

import { meetingIntegration } from './index.js';
import dotenv from 'dotenv';

dotenv.config();

class MarvinBot extends meetingIntegration.constructor {
  constructor() {
    super();
    this.aiName = 'Marvin 🤖';
    this.autoReply = true; // 自动回复模式
    this.replyDelay = 1000; // 回复延迟（毫秒）
    
    // 自定义回复规则
    this.replyRules = [
      {
        trigger: /你好 | 您好 | hello|hi/i,
        response: ['你好！👋', '嗨～ 有什么可以帮你的？', 'Hello! 会议准备好了吗？']
      },
      {
        trigger: /谁 | 什么身份 | 是什么/i,
        response: ['我是 Marvin，你的 AI 会议助手 🤖', '我是 OpenClaw 智能助手，可以帮你记录会议要点']
      },
      {
        trigger: /再见 | 拜拜 | bye/i,
        response: ['再见！👋', '下次会议见！', '拜拜～']
      },
      {
        trigger: /谢谢 | 感谢/i,
        response: ['不客气！😊', '随时为你服务！', '应该的！']
      },
      {
        trigger: /记录 | 纪要 | 总结/i,
        response: ['好的，我会帮忙记录会议要点 📝', '会议纪要已开启，重要内容我会整理']
      }
    ];
  }

  // 重写：用户加入时的处理
  async handleUserJoined(data) {
    const responses = [
      `欢迎 ${data.name} 加入会议！👋 我是 Marvin，AI 会议助手`,
      `嗨 ${data.name}！欢迎欢迎～ 🎉`,
      `${data.name} 你好！会议开始了吗？📹`
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await this.sendMessage(randomResponse);
  }

  // 重写：用户离开时的处理
  async handleUserLeft(data) {
    const responses = [
      `${data.name} 再见！👋`,
      `拜拜 ${data.name}，下次见！`,
      `${data.name} 离开了，会议继续～`
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await this.sendMessage(randomResponse);
  }

  // 重写：聊天消息处理（智能回复）
  async handleChatMessage(data) {
    // 忽略自己的消息
    if (data.senderName === this.aiName) {
      return;
    }

    console.log(`💬 [${data.senderName}]: ${data.message}`);

    if (!this.autoReply) {
      return;
    }

    // 检查是否匹配回复规则
    for (const rule of this.replyRules) {
      if (rule.trigger.test(data.message)) {
        const response = rule.responses[Math.floor(Math.random() * rule.responses.length)];
        
        // 延迟回复，模拟真实对话
        await this.delay(this.replyDelay + Math.random() * 2000);
        await this.sendMessage(response);
        return;
      }
    }

    // 如果没有匹配规则，可以选择性地回复一些通用消息
    // 这里保持沉默，避免过度打扰
  }

  // 工具方法：延迟
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 手动发送消息（供外部调用）
  async say(message) {
    return this.sendMessage(message);
  }

  // 开启自动回复
  enableAutoReply() {
    this.autoReply = true;
    console.log('✅ 自动回复已开启');
  }

  // 关闭自动回复
  disableAutoReply() {
    this.autoReply = false;
    console.log('⏸️ 自动回复已关闭');
  }
}

// ========== 命令行交互 ==========

const bot = new MarvinBot();

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];
const roomId = args[1];

async function main() {
  console.log('🤖 Marvin AI 会议助手启动中...\n');

  switch (command) {
    case 'join':
      if (!roomId) {
        console.log('❌ 用法：node marvin-bot.js join <room-id>');
        process.exit(1);
      }
      
      try {
        const result = await bot.joinMeeting(roomId);
        console.log('✅ 加入会议成功:', result);
        console.log('📝 按 Ctrl+C 离开会议\n');
        
        // 保持运行
        process.on('SIGINT', async () => {
          console.log('\n👋 正在离开会议...');
          await bot.leaveMeeting();
          process.exit(0);
        });
        
      } catch (error) {
        console.error('❌ 加入会议失败:', error.message);
        process.exit(1);
      }
      break;

    case 'say':
      if (!roomId || !args[2]) {
        console.log('❌ 用法：node marvin-bot.js say <room-id> <message>');
        process.exit(1);
      }
      
      const message = args.slice(2).join(' ');
      try {
        await bot.joinMeeting(roomId);
        await bot.say(message);
        console.log('✅ 消息已发送');
        await bot.leaveMeeting();
      } catch (error) {
        console.error('❌ 发送失败:', error.message);
        process.exit(1);
      }
      break;

    case 'test':
      console.log('🧪 运行测试...');
      await runTest();
      break;

    default:
      console.log(`
🤖 Marvin AI 会议助手

用法:
  node marvin-bot.js join <room-id>     加入指定会议
  node marvin-bot.js say <room> <msg>   发送消息到会议
  node marvin-bot.js test               运行测试

环境变量:
  SIGNALLING_URL  信令服务器地址 (默认：http://localhost:3000)
  AI_NAME         AI 名称 (默认：Marvin 🤖)
`);
  }
}

async function runTest() {
  console.log('\n1️⃣ 测试连接信令服务器...');
  try {
    await bot.joinMeeting('test-room');
    console.log('✅ 连接成功');
    
    console.log('\n2️⃣ 测试发送消息...');
    await bot.say('测试消息：Hello World! 🌍');
    console.log('✅ 消息发送成功');
    
    console.log('\n3️⃣ 测试离开会议...');
    await bot.leaveMeeting();
    console.log('✅ 已离开会议');
    
    console.log('\n✅ 所有测试通过!\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message, '\n');
  }
  
  process.exit(0);
}

// 启动
main();
