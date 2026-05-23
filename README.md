# Nutrition App 🥗

一个基于 **Next.js 16** 的轻量营养记录应用。用自然语言记录每一餐，AI 自动分析营养，一目了然的饮食仪表盘。

## 核心功能

- 🍽️ **自然语言记餐** — 输入"鸡胸肉 150g、米饭 200g"，AI 自动拆解食材并估算营养
- 📊 **每日营养汇总** — 热量 / 蛋白质 / 脂肪 / 碳水，一目了然
- 📝 **AI 每日总结** — 记录完成后一键生成当天的饮食总结
- 🏋️ **身体资料管理** — 身高 / 体重 / 体脂，可折叠卡片，手机友好
- 📧 **邮箱验证登录** — 注册 → 收验证邮件 → 点击链接 → 登录
- 🔧 **后台管理** — 管理员查阅用户、餐食、系统摘要
- 📱 **PWA 支持** — 添加到手机桌面，独立窗口运行

## 技术栈

| 层 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 数据库 | SQLite（内置，零配置） |
| AI | OpenAI / 兼容 API |
| 邮件 | 163 SMTP（国内直达 QQ/163 邮箱） |
| 部署 | 阿里云 ECS + Nginx + systemd |
| PWA | SVG 蔬菜图标 + Apple Touch Icon + Manifest |

## 快速开始

```bash
git clone git@github.com:mmy5067/nutrition_app.git
cd nutrition_app
npm install
cp .env.example .env
```

编辑 `.env`，本地最小配置：

```env
DATABASE_URL=sqlite:./db/local.sqlite
SECRET_KEY=<随机字符串>
OPENAI_API_KEY=<你的 API Key>
MODEL_NAME=gpt-4o-mini
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<密码>
```

启动开发模式：

```bash
npm run dev
```

访问 http://localhost:5000

## 部署

```bash
npm run build
npm start --port 5000
```

Nginx 反向代理 + Let's Encrypt SSL。

## PWA / 添加到桌面

Safari 打开网站 → 分享按钮 → 「添加到主屏幕」。以独立窗口启动，无浏览器地址栏。

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 数据库连接串（SQLite / PostgreSQL） |
| `SECRET_KEY` | 加密密钥 |
| `OPENAI_API_KEY` | AI 分析 API Key |
| `OPENAI_BASE_URL` | 自定义 API 地址（可选） |
| `MODEL_NAME` | 模型名称 |
| `ADMIN_EMAIL` | 管理员邮箱 |
| `ADMIN_PASSWORD` | 管理员密码 |
| `SMTP_HOST` | SMTP 服务器地址 |
| `SMTP_PORT` | SMTP 端口 |
| `SMTP_USER` | SMTP 账号 |
| `SMTP_PASS` | SMTP 密码 |
| `SMTP_FROM` | 发件邮箱 |
| `EMAIL_FROM` | 统一发件地址 |
| `NEXT_PUBLIC_APP_URL` | 应用外部访问 URL |

## 邮件通道

使用 **163 SMTP** 发送验证邮件，国内直达，QQ 邮箱 / 163 邮箱均可正常接收。

## 文件结构

```
nutrition_app/
├── app/
│   ├── admin/          # 后台管理
│   ├── api/            # API 路由
│   ├── dashboard/      # 用户仪表盘
│   ├── login/          # 登录/注册
│   └── layout.tsx      # 全局布局（PWA 配置）
├── lib/
│   ├── server/         # 服务端逻辑
│   └── api.ts          # 前端 API 工具
├── public/
│   ├── icons/          # 应用图标
│   └── manifest.json   # PWA 配置
├── temp/legacy-python/ # 旧版本代码
└── .env
```

## 许可证

MIT