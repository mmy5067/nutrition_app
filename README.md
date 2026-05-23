# Nutrition App 🥗

一个基于 **Next.js 16** 的轻量营养记录应用。用自然语言记录每一餐，AI 自动分析营养，一目了然的饮食仪表盘。

## 核心功能

| 功能 | 说明 |
|------|------|
| 🍽️ **自然语言记餐** | 输入"鸡胸肉 150g、米饭 200g、西兰花一份"，AI 自动拆解食材并估算热量 |
| 📊 **每日营养汇总** | 热量 / 蛋白质 / 脂肪 / 碳水，一目了然 |
| 📝 **AI 每日总结** | 记录完成后一键生成当天的饮食总结 |
| 🏋️ **身体资料管理** | 记录身高 / 体重 / 体脂，可折叠式卡片设计，手机友好 |
| 📧 **邮箱验证登录** | 注册 → 收验证邮件 → 点击链接 → 登录，0 短信依赖 |
| 🔧 **后台管理** | 管理员可查阅用户、餐食、系统摘要 |
| 📱 **PWA 支持** | 可添加到手机桌面，带图标 / 独立窗口 / Splash Screen |

## 技术栈

| 层 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 数据库 | SQLite（内置，零配置） |
| AI | OpenAI / 兼容 API |
| 邮件 | 163 SMTP（主力）+ Resend（备用） |
| 部署 | 阿里云 ECS + Nginx + systemd |
| 图标 | SVG 蔬菜图标（iOS / Android 桌面图标均已配置） |

## 快速开始

```bash
# 克隆
git clone git@github.com:mmy5067/nutrition_app.git
cd nutrition_app

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
```

编辑 `.env`，本地最小配置：

```env
DATABASE_URL=sqlite:./db/local.sqlite
SECRET_KEY=change_me_to_a_random_long_value
OPENAI_API_KEY=sk-xxx
MODEL_NAME=gpt-4o-mini
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456
```

启动开发模式：

```bash
npm run dev
```

访问 http://localhost:5000

## 部署

单台 2 核 2G ECS 友好设计，推荐 production build：

```bash
npm run build
npm start --port 5000
```

Nginx 反向代理 + Let's Encrypt 白嫖 SSL，参考 `nginx.conf` 示例（见下方）。

## PWA / 添加到桌面

网站支持 PWA，用 Safari 打开后：

1. 点击分享按钮
2. 选择「添加到主屏幕」
3. 应用以独立窗口启动，无浏览器地址栏
4. 桌面显示蔬菜图标 + 名称"营养记录"

## 环境变量说明

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 数据库连接串（SQLite / PostgreSQL） |
| `SECRET_KEY` | 加密密钥，用于 session |
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
| `RESEND_API_KEY` | Resend API Key（备用通道） |
| `RESEND_FROM` | Resend 发件地址 |
| `EMAIL_FROM` | 统一发件地址 |
| `NEXT_PUBLIC_APP_URL` | 应用外部访问 URL |

## Nginx 配置参考

```nginx
server {
    server_name nutrition.lovezoe.top;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin {
        # 建议加 IP 白名单
        # allow YOUR_IP;
        # deny all;

        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/example.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.top/privkey.pem;
}
```

## 邮件通道

默认使用 **163 SMTP**（国内直达，不被拦截），失败时自动 **fallback 到 Resend**：

```
SMTP（163）→ 成功 ✓
SMTP（163）→ 失败 → Resend（备用）
```

QQ 邮箱 / 163 邮箱均可正常接收验证邮件。

## 文件结构摘要

```
nutrition_app/
├── app/
│   ├── admin/          # 后台管理页面
│   ├── api/            # API 路由
│   ├── dashboard/      # 用户仪表盘
│   ├── login/          # 登录/注册页面
│   └── layout.tsx      # 全局布局（含图标 / PWA 配置）
├── lib/
│   ├── server/         # 服务端逻辑（DB / 邮件 / AI）
│   └── api.ts          # 前端 API 工具
├── public/
│   ├── icons/          # 应用图标（SVG + PNG）
│   └── manifest.json   # PWA 配置文件
├── temp/
│   └── legacy-python/  # 旧版本 Python 代码（参考用）
├── .env                # 环境变量
└── next.config.mjs     # Next.js 配置
```

## 许可证

MIT
