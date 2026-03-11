FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制静态文件
COPY public/ ./public/

# 暴露端口
EXPOSE 8080

# 启动静态文件服务器
CMD ["npm", "start"]
