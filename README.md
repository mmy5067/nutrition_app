# Nutrition App

这是一个从旧版 Python + JS 项目迁移过来的 `Next.js` 应用。当前版本优先保证本地联调可用，并补回最基础的后台管理能力。

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 检查 `.env`

默认情况下项目会直接使用本地 SQLite 文件，不需要额外安装 PostgreSQL：

```bash
DATABASE_URL=sqlite:./db/local.sqlite
SECRET_KEY=change_me_to_a_random_long_value
OPENAI_API_KEY=
OPENAI_BASE_URL=
MODEL_NAME=gpt-4o-mini
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456
```

3. 启动开发环境

```bash
npm run dev
```

默认页面：

- 首页：`http://127.0.0.1:5000`
- 登录页：`http://127.0.0.1:5000/login`
- 仪表盘：`http://127.0.0.1:5000/dashboard`
- 管理后台：`http://127.0.0.1:5000/admin/`
- 健康检查：`http://127.0.0.1:5000/healthz`

## 本地默认管理员

- 邮箱：`admin@example.com`
- 密码：`admin123456`

启动时如果数据库里不存在这个账号，系统会自动创建并赋予管理员权限。

## 数据库说明

- 开发环境推荐：SQLite，本地零额外依赖。
- 生产环境可继续使用 PostgreSQL，只需要把 `DATABASE_URL` 改成 `postgresql://...`。

## 当前已补齐的后台功能

- `/admin/` 管理页
- 总用户数、7 天活跃用户、总餐食数、24 小时新增餐食
- 最近用户列表
- 最近餐食列表
- 删除普通用户

## 部署端口与 Nginx

你当前线上 Nginx 已经转发到 `127.0.0.1:5000`。为了少改线上配置，这个项目现在直接固定监听 `5000`。另外，`/admin` 和 `/admin/` 都要限制，否则精确路径 `/admin` 可能绕过你现在的白名单：

```nginx
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
```

现在直接用：

```bash
npm run dev
npm run start
```
