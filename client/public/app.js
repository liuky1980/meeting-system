// 会议应用主逻辑
import { WebRTCManager } from './webrtc.js';

class MeetingApp {
  constructor() {
    this.socket = null;
    this.webrtc = null;
    this.roomId = null;
    this.userName = null;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.startTime = null;
    this.timerInterval = null;
    
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // 屏幕
    this.screens = {
      login: document.getElementById('login-screen'),
      meeting: document.getElementById('meeting-screen'),
      waiting: document.getElementById('waiting-screen')
    };

    // 登录表单
    this.loginForm = {
      username: document.getElementById('username'),
      roomId: document.getElementById('room-id'),
      enableVideo: document.getElementById('enable-video'),
      enableAudio: document.getElementById('enable-audio'),
      generateBtn: document.getElementById('generate-room'),
      joinBtn: document.getElementById('join-btn')
    };

    // 会议界面
    this.meetingUI = {
      roomId: document.getElementById('current-room-id'),
      participantCount: document.getElementById('participant-count'),
      meetingTime: document.getElementById('meeting-time'),
      videoGrid: document.getElementById('video-grid'),
      localVideo: document.getElementById('local-video'),
      localName: document.getElementById('local-name'),
      participantList: document.getElementById('participant-list'),
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      sendChatBtn: document.getElementById('send-chat')
    };

    // 控制按钮
    this.controls = {
      toggleAudio: document.getElementById('toggle-audio'),
      toggleVideo: document.getElementById('toggle-video'),
      shareScreen: document.getElementById('share-screen'),
      leave: document.getElementById('leave-meeting')
    };

    // 标签页
    this.tabs = document.querySelectorAll('.tab');
    this.tabContents = {
      participants: document.getElementById('participants-panel'),
      chat: document.getElementById('chat-panel')
    };
  }

  bindEvents() {
    // 生成随机房间 ID
    this.loginForm.generateBtn.addEventListener('click', () => {
      this.loginForm.roomId.value = this.generateRoomId();
    });

    // 加入会议
    this.loginForm.joinBtn.addEventListener('click', () => this.joinMeeting());

    // 控制按钮
    this.controls.toggleAudio.addEventListener('click', () => this.toggleAudio());
    this.controls.toggleVideo.addEventListener('click', () => this.toggleVideo());
    this.controls.shareScreen.addEventListener('click', () => this.shareScreen());
    this.controls.leave.addEventListener('click', () => this.leaveMeeting());

    // 聊天
    this.meetingUI.sendChatBtn.addEventListener('click', () => this.sendChat());
    this.meetingUI.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChat();
    });

    // 标签页切换
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // 页面关闭前离开会议
    window.addEventListener('beforeunload', () => this.leaveMeeting());
  }

  generateRoomId() {
    return 'room-' + Math.random().toString(36).substring(2, 8);
  }

  async joinMeeting() {
    const username = this.loginForm.username.value.trim();
    const roomId = this.loginForm.roomId.value.trim();

    if (!username || !roomId) {
      alert('请输入姓名和会议 ID');
      return;
    }

    this.userName = username;
    this.roomId = roomId;

    this.showScreen('waiting');

    try {
      // 获取本地媒体流
      await this.getLocalMedia();
      
      // 连接信令服务器
      this.connectSignaling();
      
    } catch (error) {
      console.error('加入会议失败:', error);
      alert('无法获取摄像头或麦克风权限');
      this.showScreen('login');
    }
  }

  async getLocalMedia() {
    const constraints = {
      audio: this.loginForm.enableAudio.checked,
      video: this.loginForm.enableVideo.checked ? {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    };

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.meetingUI.localVideo.srcObject = this.localStream;
    this.meetingUI.localName.textContent = this.userName;
  }

  connectSignaling() {
    const signalingUrl = window.location.origin;
    this.socket = io(signalingUrl);

    this.socket.on('connect', () => {
      console.log('已连接到信令服务器');
      this.joinRoom();
    });

    this.socket.on('room-joined', (data) => {
      console.log('已加入房间:', data);
      this.showScreen('meeting');
      this.startTimer();
      this.meetingUI.roomId.textContent = this.roomId;
      
      // 与现有参与者建立连接
      data.peers.forEach(peer => {
        this.webrtc.createOffer(peer.id);
      });
    });

    this.socket.on('user-joined', async (data) => {
      console.log('用户加入:', data);
      this.addParticipant(data);
      this.webrtc.createOffer(data.userId);
    });

    this.socket.on('offer', async (data) => {
      console.log('收到 offer');
      const answer = await this.webrtc.handleOffer(data.offer);
      this.socket.emit('answer', {
        targetId: data.senderId,
        answer
      });
    });

    this.socket.on('answer', async (data) => {
      console.log('收到 answer');
      await this.webrtc.handleAnswer(data.answer);
    });

    this.socket.on('ice-candidate', async (data) => {
      if (data.candidate) {
        await this.webrtc.addIceCandidate(data.candidate);
      }
    });

    this.socket.on('user-left', (data) => {
      console.log('用户离开:', data);
      this.removeParticipant(data.userId);
    });

    this.socket.on('chat-message', (data) => {
      this.addChatMessage(data.name, data.message, data.timestamp);
    });

    this.socket.on('media-updated', (data) => {
      this.updateParticipantMedia(data.userId, data.media);
    });

    // 初始化 WebRTC
    this.webrtc = new WebRTCManager(this.localStream, (stream, peerId) => {
      this.handleRemoteStream(stream, peerId);
    });
  }

  joinRoom() {
    const media = {
      audio: this.loginForm.enableAudio.checked,
      video: this.loginForm.enableVideo.checked
    };

    this.socket.emit('join-room', {
      roomId: this.roomId,
      name: this.userName,
      media
    });
  }

  handleRemoteStream(stream, peerId) {
    this.remoteStreams.set(peerId, stream);
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container remote';
    videoContainer.id = `video-${peerId}`;
    videoContainer.innerHTML = `
      <video autoplay playsinline></video>
      <div class="video-label">
        <span class="name">参与者</span>
        <div class="media-status">
          <span class="icon mic">🎤</span>
          <span class="icon cam">📷</span>
        </div>
      </div>
    `;
    
    videoContainer.querySelector('video').srcObject = stream;
    this.meetingUI.videoGrid.appendChild(videoContainer);
  }

  addParticipant(data) {
    const item = document.createElement('div');
    item.className = 'participant-item';
    item.id = `participant-${data.userId}`;
    item.innerHTML = `
      <div class="participant-avatar">${data.name[0].toUpperCase()}</div>
      <div class="participant-info">
        <div class="participant-name">${data.name}</div>
        <div class="participant-status">
          <span class="mic-status">${data.media.audio ? '🎤' : '🔇'}</span>
          <span class="cam-status">${data.media.video ? '📷' : '📷❌'}</span>
        </div>
      </div>
    `;
    this.meetingUI.participantList.appendChild(item);
    this.updateParticipantCount();
  }

  removeParticipant(userId) {
    const video = document.getElementById(`video-${userId}`);
    if (video) video.remove();
    
    const participant = document.getElementById(`participant-${userId}`);
    if (participant) participant.remove();
    
    this.remoteStreams.delete(userId);
    this.updateParticipantCount();
  }

  updateParticipantMedia(userId, media) {
    const participant = document.getElementById(`participant-${userId}`);
    if (participant) {
      const micStatus = participant.querySelector('.mic-status');
      const camStatus = participant.querySelector('.cam-status');
      micStatus.textContent = media.audio ? '🎤' : '🔇';
      camStatus.textContent = media.video ? '📷' : '📷❌';
    }
  }

  updateParticipantCount() {
    const count = this.meetingUI.participantList.children.length + 1;
    this.meetingUI.participantCount.textContent = `${count} 人在线`;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.controls.toggleAudio.classList.toggle('active', !audioTrack.enabled);
        this.socket.emit('media-toggle', {
          roomId: this.roomId,
          media: { audio: audioTrack.enabled }
        });
      }
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.controls.toggleVideo.classList.toggle('active', !videoTrack.enabled);
        this.socket.emit('media-toggle', {
          roomId: this.roomId,
          media: { video: videoTrack.enabled }
        });
      }
    }
  }

  async shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = this.webrtc.peerConnections.values().next().value
        ?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        sender.replaceTrack(screenTrack);
      }
      
      screenTrack.onended = () => {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      };
      
      this.controls.shareScreen.classList.add('active');
    } catch (error) {
      console.error('屏幕共享失败:', error);
    }
  }

  sendChat() {
    const message = this.meetingUI.chatInput.value.trim();
    if (!message) return;

    this.socket.emit('chat-message', {
      roomId: this.roomId,
      message,
      senderName: this.userName
    });

    this.addChatMessage(this.userName, message, Date.now());
    this.meetingUI.chatInput.value = '';
  }

  addChatMessage(name, text, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    const time = new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    messageDiv.innerHTML = `
      <div class="chat-message-header">
        <span class="chat-message-name">${name}</span>
        <span class="chat-message-time">${time}</span>
      </div>
      <div class="chat-message-text">${this.escapeHtml(text)}</div>
    `;
    this.meetingUI.chatMessages.appendChild(messageDiv);
    this.meetingUI.chatMessages.scrollTop = this.meetingUI.chatMessages.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  switchTab(tabName) {
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    Object.keys(this.tabContents).forEach(key => {
      this.tabContents[key].classList.toggle('active', key === tabName);
    });
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      this.meetingUI.meetingTime.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  leaveMeeting() {
    if (this.socket) {
      this.socket.emit('leave-room', { roomId: this.roomId });
      this.socket.disconnect();
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.remoteStreams.clear();
    this.showScreen('login');
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      screen.classList.remove('active');
    });
    this.screens[screenName].classList.add('active');
  }
}

// 启动应用
const app = new MeetingApp();
