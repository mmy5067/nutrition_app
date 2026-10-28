# 自部署指南

## 构建与进程

需要 Node.js 22.18+（推荐 24 LTS）、npm、Git 和 Nginx。以非 root 用户 `app`、目录 `/srv/nutrition-app` 为例，按实际环境调整：

```bash
git clone https://github.com/mmy5067/nutrition_app.git /srv/nutrition-app
cd /srv/nutrition-app
npm ci
npm run setup
# 编辑 .env.local：管理员邮箱、AI、SMTP、数据库和 HTTPS 站点地址
npm test
npm run typecheck
npm run build
npm run smoke
npm start -- --hostname 127.0.0.1
```

默认端口 5000。前台确认运行正常后退出，再使用 systemd。构建时也需要有效密钥；数据库在首次查询时连接，SQLite 数据目录应允许应用用户写入。

创建 `/etc/systemd/system/nutrition-app.service`：

```ini
[Unit]
Description=Nutrition App
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/srv/nutrition-app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- --hostname 127.0.0.1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

用 `command -v npm` 核对执行路径；使用 nvm 时也要保证服务 PATH 能找到 node。Next.js 自动读取工作目录 `.env.local`，请限制配置文件权限。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nutrition-app
sudo systemctl status nutrition-app
sudo journalctl -u nutrition-app -n 100 --no-pager
```

## Nginx 与 HTTPS

将下面域名替换为自己的域名，配置 DNS；这是申请证书前的 HTTP 配置：

```nginx
server {
    listen 80;
    server_name nutrition.example.com;
    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

安装证书并启用 HTTPS 后再公开提供生产服务，生产 Cookie 有 `Secure` 属性。将 `NEXT_PUBLIC_APP_URL` 设为实际 HTTPS 地址，再构建并重启。不要对外开放 5000 或数据库端口。

## 更新与排错

更新流程：`git pull --ff-only` → `npm ci` → 测试和类型检查 → `npm run build` → 重启服务。用户数据与 `.env.local` 不应进入 Git。

| 现象 | 检查 |
| --- | --- |
| 密钥配置错误 | `SECRET_KEY` / `ADMIN_PASSWORD` 是否为空、过短或旧示例值 |
| AI 配置错误 | 同时填写 Key、地址、模型；地址不重复包含 `/chat/completions` |
| 注册后不能登录 | SMTP、发件地址、465 TLS、站点 URL，以及验证邮件是否送达 |
| 更改环境变量未重置管理员密码 | 初始化不负责重置已有账号密码 |
| PostgreSQL 失败 | 数据库是否存在，账号是否具备建表权限，网络是否可达 |
| SQLite 写入失败 | 数据文件与父目录是否可写 |

`/healthz` 仅检查 HTTP 进程。面向公众需另外配置登录限流、访问认证与用量配额。
