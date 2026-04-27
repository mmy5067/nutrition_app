# Nutrition App

一个基于 `Next.js` 的轻量营养记录应用，支持自然语言记餐、每日营养汇总、后台管理，以及基于 Resend 的邮箱验证登录流程。

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

复制 `.env.example` 为 `.env`，本地最小配置如下：

```env
DATABASE_URL=sqlite:./db/local.sqlite
SECRET_KEY=change_me_to_a_random_long_value

OPENAI_API_KEY=
OPENAI_BASE_URL=
MODEL_NAME=gpt-4o-mini

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456

RESEND_API_KEY=
EMAIL_FROM=
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

3. 启动开发环境

```bash
npm run dev
```

默认地址：

- 首页：`http://127.0.0.1:5000`
- 登录页：`http://127.0.0.1:5000/login`
- 仪表盘：`http://127.0.0.1:5000/dashboard`
- 后台管理：`http://127.0.0.1:5000/admin/`

## 邮箱验证说明

当前采用轻量邮箱验证方案，适合单机小服务器部署：

- 注册成功后生成随机 token
- 数据库只保存 `tokenHash`
- token 有效期为 24 小时
- 通过 Resend API 直接发送验证邮件
- 不引入 BullMQ、RabbitMQ、SMTP 服务、常驻 worker
- 重发验证邮件接口带简单频率限制
- 未验证邮箱不能登录

当前流程不是“输入验证码”，而是：

1. 用户注册
2. 系统发送验证邮件
3. 用户点击邮件中的验证链接
4. 验证成功后再登录

## 数据库说明

开发环境默认使用本地 SQLite：

```env
DATABASE_URL=sqlite:./db/local.sqlite
```

特点：

- 零额外服务，适合本地开发和单机测试
- 应用启动时自动建表
- 自动初始化默认管理员账号

生产环境如果仍使用单台 2 核 2G 服务器，也可以继续使用 SQLite。  
如果后续要多实例部署或做更复杂的数据管理，再切 PostgreSQL。

如需切换 PostgreSQL，只要把 `DATABASE_URL` 改成：

```env
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/nutrition_app
```

应用会按现有初始化逻辑自动补齐表结构。

## Resend 配置

必须配置：

```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=Nutrition App <no-reply@nutrition.lovezoe.top>
NEXT_PUBLIC_APP_URL=https://nutrition.lovezoe.top
```

注意：

- `EMAIL_FROM` 必须使用你在 Resend 后台已验证域名下的发件地址
- 本地测试可以临时用 `onboarding@resend.dev`
- 正式上线不要继续用 `onboarding@resend.dev`
- `NEXT_PUBLIC_APP_URL` 必须是用户实际访问的域名，否则邮件链接会跳错地址

## 2 核 2G 服务器部署建议

这台机器配置不高，建议保持单进程、少组件、少常驻服务：

- 应用：`next build` + `next start --port 5000`
- 数据库：优先 SQLite 单文件
- 邮件：直接调用 Resend API
- 进程管理：`systemd`
- 反向代理：`nginx`

不要额外引入：

- Redis
- BullMQ
- RabbitMQ
- 自建 SMTP
- 常驻队列 worker

## 生产环境变量示例

```env
DATABASE_URL=sqlite:/var/www/nutrition_app/db/prod.sqlite
SECRET_KEY=请替换为随机长串

OPENAI_API_KEY=你的_openai_key
OPENAI_BASE_URL=
MODEL_NAME=gpt-4o-mini

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=请替换为强密码

RESEND_API_KEY=你的_resend_key
EMAIL_FROM=Nutrition App <no-reply@nutrition.lovezoe.top>
NEXT_PUBLIC_APP_URL=https://nutrition.lovezoe.top
```

## 服务器部署步骤

以下假设项目部署目录为 `/var/www/nutrition_app`。

1. 上传代码并安装依赖

```bash
cd /var/www/nutrition_app
npm install
```

2. 配置生产环境变量

```bash
cp .env.example .env
```

然后按上面的生产示例修改 `.env`。

3. 创建 SQLite 数据目录

```bash
mkdir -p /var/www/nutrition_app/db
```

4. 构建生产版本

```bash
npm run build
```

5. 本机验证启动

```bash
npm run start
```

确认应用能在 `127.0.0.1:5000` 正常访问。

## systemd 示例

可在 `/etc/systemd/system/nutrition-app.service` 中写入：

```ini
[Unit]
Description=Nutrition App
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/nutrition_app
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

启用方式：

```bash
sudo systemctl daemon-reload
sudo systemctl enable nutrition-app
sudo systemctl start nutrition-app
sudo systemctl status nutrition-app
```

查看日志：

```bash
journalctl -u nutrition-app -f
```

## Nginx 配置

当前项目端口固定为 `5000`，可以继续复用你现有反向代理。

建议配置：

```nginx
server {
    server_name nutrition.lovezoe.top;

    access_log /var/log/nginx/nutrition_access.log;
    error_log  /var/log/nginx/nutrition_error.log;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /admin {
        allow 180.160.54.19;
        deny all;

        proxy_pass http://127.0.0.1:5000/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        allow 180.160.54.19;
        deny all;

        proxy_pass http://127.0.0.1:5000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/lovezoe.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lovezoe.top/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

## 上线前检查

建议至少确认以下项目：

1. 注册新账号后能收到验证邮件
2. 未验证邮箱不能登录
3. 点邮件链接后可以正常验证并登录
4. 管理员账号可以看到后台入口
5. 普通用户看不到后台入口
6. `/admin` 和 `/admin/` 都受 Nginx 白名单限制
7. `SECRET_KEY`、`OPENAI_API_KEY`、`RESEND_API_KEY` 已替换为正式值

## 默认管理员

开发环境默认管理员：

- 邮箱：`admin@example.com`
- 密码：`admin123456`

生产环境务必改掉。
