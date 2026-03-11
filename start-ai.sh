#!/bin/bash

# 启动 AI 会议助手脚本
# 用法：./start-ai.sh [room-id]

ROOM_ID=${1:-"demo-room"}

echo "🤖 启动 AI 会议助手..."
echo "📹 会议室：$ROOM_ID"
echo ""

cd "$(dirname "$0")/openclaw-integration"

# 检查信令服务器是否运行
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ 信令服务器未运行！"
    echo "请先执行：docker compose up -d"
    exit 1
fi

echo "✅ 信令服务器已就绪"
echo ""

# 启动 Marvin（后台）
echo "🚀 启动 Marvin..."
node marvin-bot.js join "$ROOM_ID" &
MARVIN_PID=$!

sleep 2

# 启动 Eve（后台）
echo "🚀 启动 Eve..."
node eve-bot.js join "$ROOM_ID" &
EVE_PID=$!

echo ""
echo "✅ AI 助手已启动！"
echo "   Marvin PID: $MARVIN_PID"
echo "   Eve PID: $EVE_PID"
echo ""
echo "📹 访问会议：http://localhost:8088?room=$ROOM_ID"
echo ""
echo "按 Ctrl+C 停止所有 AI 助手"

# 等待中断信号
trap "kill $MARVIN_PID $EVE_PID 2>/dev/null; echo ''; echo '👋 AI 助手已停止'; exit 0" INT

# 保持运行
wait
