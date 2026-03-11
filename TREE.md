meeting-system/
│
├── 📁 server/                      # 信令服务器 (Node.js + Socket.io)
│   ├── 📁 src/
│   │   └── 📄 index.js            # 服务器主逻辑
│   ├── 📄 package.json            # 依赖配置
│   └── 📄 Dockerfile              # 容器配置
│
├── 📁 client/                      # 前端 UI (纯 HTML/JS)
│   ├── 📁 public/
│   │   ├── 📄 index.html          # 主页面
│   │   ├── 📄 styles.css          # 样式表
│   │   ├── 📄 app.js              # 应用逻辑
│   │   └── 📄 webrtc.js           # WebRTC 管理
│   ├── 📄 package.json            # 依赖配置
│   └── 📄 Dockerfile              # 容器配置
│
├── 📁 feishu-bot/                  # 飞书机器人 (可选)
│   ├── 📁 src/
│   │   └── 📄 index.js            # 机器人逻辑
│   ├── 📄 package.json            # 依赖配置
│   └── 📄 Dockerfile              # 容器配置
│
├── 📁 nginx/                       # Nginx 配置 (生产环境)
│   └── 📄 nginx.conf              # 反向代理配置
│
├── 📄 docker-compose.yml           # 开发环境编排
├── 📄 docker-compose.prod.yml      # 生产环境编排
├── 📄 .env.example                 # 环境变量模板
├── 📄 .gitignore                   # Git 忽略规则
│
├── 📄 deploy.sh                    # 一键部署脚本
├── 📄 stop.sh                      # 停止服务脚本
│
├── 📄 README.md                    # 完整使用说明
└── 📄 IMPLEMENTATION.md            # 实现总结
