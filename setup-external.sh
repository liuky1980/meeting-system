#!/bin/bash

# 会议系统外部访问配置脚本
# 用于配置 liuky.net 域名的 HTTPS 反向代理

set -e

DOMAIN="meeting.liuky.net"
EMAIL="admin@liuky.net"

echo "🔧 会议系统外部访问配置"
echo "========================"
echo ""
echo "域名：$DOMAIN"
echo "邮箱：$EMAIL"
echo ""

# 检查是否已安装 nginx
if ! command -v nginx &> /dev/null; then
    echo "⚠️  Nginx 未安装，请先安装："
    echo ""
    echo "  # Ubuntu/Debian"
    echo "  sudo apt update && sudo apt install -y nginx"
    echo ""
    echo "  # CentOS/RHEL"
    echo "  sudo yum install -y nginx"
    echo ""
    echo "安装完成后重新运行此脚本"
    exit 1
fi

# 检查是否已安装 certbot
if ! command -v certbot &> /dev/null; then
    echo "⚠️  Certbot 未安装，请先安装："
    echo ""
    echo "  # Ubuntu/Debian"
    echo "  sudo apt install -y certbot python3-certbot-nginx"
    echo ""
    echo "  # CentOS/RHEL"
    echo "  sudo yum install -y certbot python3-certbot-nginx"
    echo ""
    echo "安装完成后重新运行此脚本"
    exit 1
fi

# 1. 复制 nginx 配置
echo "📋 复制 Nginx 配置..."
sudo cp nginx/meeting.conf /etc/nginx/sites-available/meeting
sudo ln -sf /etc/nginx/sites-available/meeting /etc/nginx/sites-enabled/meeting

# 2. 测试 nginx 配置
echo "🔍 测试 Nginx 配置..."
sudo nginx -t

# 3. 获取 SSL 证书
echo "🔐 获取 SSL 证书..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# 4. 重新加载 nginx
echo "🔄 重新加载 Nginx..."
sudo systemctl reload nginx

# 5. 更新 docker-compose 配置
echo "📝 更新环境变量..."
cat > .env.external << EOF
# 外部访问配置
CLIENT_URL=https://$DOMAIN
SIGNALLING_URL=https://$DOMAIN
EOF

echo ""
echo "✅ 配置完成！"
echo ""
echo "📹 外部访问地址：https://$DOMAIN"
echo ""
echo "⚠️  请确保："
echo "  1. 域名 $DOMAIN 已解析到此服务器 IP"
echo "  2. 防火墙已开放 80 和 443 端口"
echo "  3. 云服务器安全组已开放 80 和 443 端口"
echo ""
echo "🔥 防火墙命令参考："
echo "  sudo ufw allow 80/tcp"
echo "  sudo ufw allow 443/tcp"
echo "  sudo ufw allow 3000/tcp  # WebSocket 信令（可选）"
echo ""
