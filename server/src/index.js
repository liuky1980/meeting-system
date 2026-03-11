import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// 配置 CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:8080',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e6 // 1MB
});

// 存储会议房间和参与者
const rooms = new Map(); // roomId -> Set<socketId>
const peers = new Map(); // socketId -> { roomId, name, media }

app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取房间信息
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.json({ participants: [] });
  }
  const participants = Array.from(room).map(id => {
    const peer = peers.get(id);
    return {
      id,
      name: peer?.name || 'Unknown',
      media: peer?.media || { audio: false, video: false }
    };
  });
  res.json({ participants });
});

io.on('connection', (socket) => {
  console.log(`[Socket] 用户连接: ${socket.id}`);

  // 加入会议房间
  socket.on('join-room', ({ roomId, name, media }) => {
    console.log(`[Socket] ${name} 加入房间 ${roomId}`);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    rooms.get(roomId).add(socket.id);
    peers.set(socket.id, { roomId, name, media });
    
    socket.join(roomId);
    socket.emit('room-joined', { roomId, peers: getRoomPeers(roomId, socket.id) });
    
    // 通知房间内其他用户
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      name,
      media
    });
  });

  // 转发 WebRTC offer
  socket.on('offer', ({ targetId, offer }) => {
    console.log(`[Socket] 发送 offer 到 ${targetId}`);
    io.to(targetId).emit('offer', {
      senderId: socket.id,
      offer
    });
  });

  // 转发 WebRTC answer
  socket.on('answer', ({ targetId, answer }) => {
    console.log(`[Socket] 发送 answer 到 ${targetId}`);
    io.to(targetId).emit('answer', {
      senderId: socket.id,
      answer
    });
  });

  // 转发 ICE candidate
  socket.on('ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  // 聊天消息
  socket.on('chat-message', ({ roomId, message, senderName }) => {
    console.log(`[Chat] ${senderName}: ${message}`);
    io.to(roomId).emit('chat-message', {
      userId: socket.id,
      name: senderName,
      message,
      timestamp: Date.now()
    });
  });

  // 媒体状态更新
  socket.on('media-toggle', ({ roomId, media }) => {
    const peer = peers.get(socket.id);
    if (peer) {
      peer.media = { ...peer.media, ...media };
    }
    socket.to(roomId).emit('media-updated', {
      userId: socket.id,
      media
    });
  });

  // 离开房间
  socket.on('leave-room', ({ roomId }) => {
    handleDisconnect(socket, roomId);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`[Socket] 用户断开: ${socket.id}`);
    const peer = peers.get(socket.id);
    if (peer) {
      handleDisconnect(socket, peer.roomId);
    }
  });
});

function getRoomPeers(roomId, excludeId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  
  return Array.from(room)
    .filter(id => id !== excludeId)
    .map(id => {
      const peer = peers.get(id);
      return {
        id,
        name: peer?.name || 'Unknown',
        media: peer?.media || { audio: false, video: false }
      };
    });
}

function handleDisconnect(socket, roomId) {
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      socket.to(roomId).emit('user-left', { userId: socket.id });
    }
  }
  peers.delete(socket.id);
  socket.leave(roomId);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 信令服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket 已启用`);
});
