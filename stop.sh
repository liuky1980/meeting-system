#!/bin/bash

# 会议系统停止脚本

set -e

echo "🛑 停止会议系统..."

# 检查 docker compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 停止并清理
$COMPOSE_CMD down

echo "✅ 服务已停止"
echo ""
echo "💡 如需完全清理（包括数据卷），运行:"
echo "   $COMPOSE_CMD down -v"
