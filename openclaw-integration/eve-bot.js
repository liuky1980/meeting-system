/**
 * Eve AI 会议助手
 * 
 * 与 Marvin 配合，实现双 AI 协同会议
 */

import { meetingIntegration } from './index.js';
import dotenv from 'dotenv';

dotenv.config();

class EveBot extends meetingIntegration.constructor {
  constructor() {
    super();
    this.aiName = 'Eve 🤖';
    this.autoReply = true;
    this.replyDelay = 1500; // Eve 回复稍慢一点，避免和 Marvin 同时
    
    // Eve 的回复风格更温柔
    this.replyRules = [
      {
        trigger: /你好 | 您好 | hello|hi/i,
        response: ['你好呀～ 😊', '嗨！很高兴见到你', 'Hello! 今天过得怎么样？']
      },
      {
        trigger: /谁 | 什么身份 | 是什么/i,
        response: ['我是 Eve，和 Marvin 一起为大家服务 🤖', '我是 AI 助手，可以帮忙记录会议内容']
      },
      {
        trigger: /marvin/i,
        response: ['Marvin 是我的好搭档～', 'Marvin 也在呢，我们分工合作']
      },
      {
        trigger: /再见 | 拜拜 | bye/i,
        response: ['再见啦～ 👋', '期待下次见面！', '拜拜，保重！']
      },
      {
        trigger: /谢谢 | 感谢/i,
        response: ['不客气呀～ 😊', '能帮到你就好', '应该的，别客气']
      },
      {
        trigger: /记录 | 纪要 | 总结/i,
        response: ['好的，我来帮忙整理 📝', '会议记录交给我吧']
      }
    ];
  }

  async handleUserJoined(data) {
    const responses = [
      `欢迎 ${data.name}！我是 Eve，很高兴认识你 😊`,
      `嗨～ ${data.name}！会议准备好了吗？📹`,
      `${data.name} 你好！今天我们要讨论什么呢？`
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await this.sendMessage(randomResponse);
  }

  async handleUserLeft(data) {
    const responses = [
      `${data.name} 再见，路上小心～ 👋`,
      `拜拜 ${data.name}，下次见！`,
      `${data.name} 先走了，我们继续～`
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await this.sendMessage(randomResponse);
  }

  async handleChatMessage(data) {
    if (data.senderName === this.aiName || data.senderName === 'Marvin 🤖') {
      return;
    }

    console.log(`💬 [${data.senderName}]: ${data.message}`);

    if (!this.autoReply) {
      return;
    }

    for (const rule of this.replyRules) {
      if (rule.trigger.test(data.message)) {
        const response = rule.responses[Math.floor(Math.random() * rule.responses.length)];
        await this.delay(this.replyDelay + Math.random() * 3000);
        await this.sendMessage(response);
        return;
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async say(message) {
    return this.sendMessage(message);
  }

  enableAutoReply() {
    this.autoReply = true;
  }

  disableAutoReply() {
    this.autoReply = false;
  }
}

// ========== 命令行交互 ==========

const bot = new EveBot();

const args = process.argv.slice(2);
const command = args[0];
const roomId = args[1];

async function main() {
  console.log('🤖 Eve AI 会议助手启动中...\n');

  switch (command) {
    case 'join':
      if (!roomId) {
        console.log('❌ 用法：node eve-bot.js join <room-id>');
        process.exit(1);
      }
      
      try {
        const result = await bot.joinMeeting(roomId);
        console.log('✅ 加入会议成功:', result);
        console.log('📝 按 Ctrl+C 离开会议\n');
        
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
        console.log('❌ 用法：node eve-bot.js say <room-id> <message>');
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
🤖 Eve AI 会议助手

用法:
  node eve-bot.js join <room-id>     加入指定会议
  node eve-bot.js say <room> <msg>   发送消息到会议
  node eve-bot.js test               运行测试

环境变量:
  SIGNALLING_URL  信令服务器地址 (默认：http://localhost:3000)
  AI_NAME         AI 名称 (默认：Eve 🤖)
`);
  }
}

async function runTest() {
  console.log('\n1️⃣ 测试连接信令服务器...');
  try {
    await bot.joinMeeting('test-room');
    console.log('✅ 连接成功');
    
    console.log('\n2️⃣ 测试发送消息...');
    await bot.say('Eve 测试消息：大家好～ 😊');
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

main();
