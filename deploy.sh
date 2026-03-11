#!/bin/bash

# 会议系统部署脚本

set -e

echo "🚀 开始部署会议系统..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

# 检查 docker compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose 未安装"
    exit 1
fi

echo "✅ 使用 $COMPOSE_CMD"

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件配置飞书凭证（可选）"
fi

# 构建并启动
echo "🔨 构建 Docker 镜像..."
$COMPOSE_CMD build

echo "🚀 启动服务..."
$COMPOSE_CMD up -d

# 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "📊 服务状态:"
$COMPOSE_CMD ps

echo ""
echo "✅ 部署完成!"
echo ""
echo "📍 访问地址:"
echo "   前端：http://localhost:8080"
echo "   信令服务器：http://localhost:3000"
echo ""
echo "📋 常用命令:"
echo "   查看日志：$COMPOSE_CMD logs -f"
echo "   停止服务：$COMPOSE_CMD down"
echo "   重启服务：$COMPOSE_CMD restart"
echo ""
