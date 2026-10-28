# 配置说明

Next.js 自动读取根目录 `.env.local`；`npm run setup` 根据 `.env.example` 生成它。已有 `.env` 或 `.env.local` 时脚本会退出，避免覆盖。

| 变量 | 必需性与说明 |
| --- | --- |
| `SECRET_KEY` | 必填，至少 32 字符的独立随机密钥；修改后已有会话失效 |
| `ADMIN_EMAIL` | 初始管理员邮箱，默认 `admin@example.com`，首次使用数据库时自动创建并验证 |
| `ADMIN_PASSWORD` | 必填，至少 12 字符，仅用于创建管理员，不重置已有密码 |
| `DATABASE_URL` | 默认 `sqlite:./db/local.sqlite`；也接受 `postgres://` / `postgresql://` |
| `OPENAI_API_KEY` | AI 功能必需，只在服务端使用 |
| `OPENAI_BASE_URL` | AI 必需，接口前缀，不包含 `/chat/completions` |
| `MODEL_NAME` | 默认 `gpt-4o-mini`，应与服务商匹配 |
| `SMTP_HOST` | 普通用户验证邮件使用的 SMTP 主机 |
| `SMTP_PORT` | 默认 `465`，当前始终使用隐式 TLS |
| `SMTP_USER` / `SMTP_PASS` | SMTP 账号与密码 / 授权码 |
| `EMAIL_FROM` | SMTP 允许的发件地址 |
| `NEXT_PUBLIC_APP_URL` | 邮件中的站点根地址，本地默认 `http://localhost:5000`，线上使用 HTTPS |

无 AI / SMTP 配置时仍可用初始化管理员登录；普通新用户验证邮件后才能登录。

PostgreSQL 需先创建独立数据库和具备建表权限的账号。应用会初始化表与索引，不会自动导入 SQLite 或历史 Flask 数据。`db/schema.sql` 是参考结构，不是完整的版本迁移脚本。

数据库文件、导出、日志、私钥和 `.env*`（示例除外）均不应提交。`package.json` 的 `private: true` 仅用于避免误发布到 npm，不影响 MIT 开源。
