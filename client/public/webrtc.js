// WebRTC 管理器
export class WebRTCManager {
  constructor(localStream, onRemoteStream) {
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.peerConnections = new Map();
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // 可以添加 TURN 服务器以提高连通性
        // {
        //   urls: 'turn:your-turn-server.com',
        //   username: 'user',
        //   credential: 'pass'
        // }
      ]
    };
  }

  async createOffer(peerId) {
    const pc = this.createPeerConnection(peerId);
    
    // 添加本地流
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    // 创建 offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    });
    
    await pc.setLocalDescription(offer);
    
    return offer;
  }

  async handleOffer(offer) {
    const pc = this.createPeerConnection(offer.senderId || 'unknown');
    
    // 添加本地流
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    return answer;
  }

  async handleAnswer(answer) {
    const pc = Array.from(this.peerConnections.values()).find(
      p => p.remoteDescription?.type === 'offer'
    );
    
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate) {
    for (const pc of this.peerConnections.values()) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('添加 ICE candidate 失败:', error);
      }
    }
  }

  createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(this.config);
    this.peerConnections.set(peerId, pc);

    // ICE candidate 处理
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // 通过信令服务器发送
        if (window.app?.socket) {
          window.app.socket.emit('ice-candidate', {
            targetId: peerId,
            candidate: event.candidate
          });
        }
      }
    };

    // 接收远程流
    pc.ontrack = (event) => {
      console.log('收到远程流');
      if (event.streams && event.streams[0]) {
        this.onRemoteStream(event.streams[0], peerId);
      }
    };

    // 连接状态监控
    pc.onconnectionstatechange = () => {
      console.log(`连接状态 [${peerId}]:`, pc.connectionState);
      
      if (pc.connectionState === 'disconnected' || 
          pc.connectionState === 'failed') {
        this.closePeerConnection(peerId);
      }
    };

    // ICE 状态监控
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE 状态 [${peerId}]:`, pc.iceConnectionState);
    };

    return pc;
  }

  closePeerConnection(peerId) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  // 关闭所有连接
  close() {
    for (const [peerId, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();
  }
}
