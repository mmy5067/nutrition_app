# Nutrition App · AI 营养记录

[![CI](https://github.com/mmy5067/nutrition_app/actions/workflows/ci.yml/badge.svg)](https://github.com/mmy5067/nutrition_app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2022.18-339933)

用一句话记录一餐，让 AI 拆解食材、估算营养，再查看当天的饮食汇总。适合个人自部署，也适合作为 Next.js 全栈应用的学习项目。

```text
输入：午饭吃了鸡胸肉 150g、米饭 200g，还有一份西兰花
  ↓ AI 拆解与估算
食物明细 · 热量 / 蛋白质 / 脂肪 / 碳水
  ↓ 保存
每日记录 · 营养汇总 · AI 饮食总结
```

## 功能

- **自然语言记餐**：从描述生成食物、份量和营养明细；支持查看、修改和删除记录。
- **每日仪表盘**：按日期查看餐食、热量及三大营养素，并生成 AI 当日总结。
- **身体资料**：记录身高、体重、体脂等信息，为饮食总结提供上下文。
- **用户与管理后台**：邮箱注册、验证邮件、登录，以及用户和近期餐食管理。
- **两种数据库**：默认本地 SQLite，也可使用 PostgreSQL；应用自动初始化表结构。
- **移动端使用**：响应式页面、Web App Manifest 和桌面图标，可添加到主屏幕；没有离线缓存功能。

技术栈：Next.js App Router、React、TypeScript、Node 内置 SQLite、`pg`、`jose` 和 Nodemailer。历史 Flask 实现在 [`archive/legacy-python`](archive/legacy-python)，不参与当前应用运行。

## 快速开始

需要 **Node.js 22.18+**（推荐 Node.js 24 LTS）、npm 和 Git。SQLite 无需额外安装数据库服务。

```bash
git clone https://github.com/mmy5067/nutrition_app.git
cd nutrition_app
npm ci
npm run setup
npm run dev
```

打开 **<http://localhost:5000>**，进入登录页。`npm run setup` 会生成被 Git 忽略的 `.env.local`，其中包含独立的随机会话密钥和管理员密码，不覆盖已有配置。

首次使用数据库时自动创建管理员：邮箱默认为 `admin@example.com`，密码查看 `.env.local` 的 `ADMIN_PASSWORD`。该账号已验证邮箱，**本地试用无需先配置 SMTP**；管理员也可以使用记餐功能。修改初始邮箱或密码应在首次启动前完成，初始化后修改环境变量不会重置已有账号密码。

未配置 AI 时可以登录、维护身体资料并查看页面；**AI 记餐与总结需要 API 配置**，项目不内置离线模型或免费模型服务。

### 开启 AI 记餐

在 `.env.local` 中填写以下参数，再重启应用：

```dotenv
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o-mini
```

模型服务需兼容 Chat Completions API，并能按提示返回 JSON。地址写到 `/v1` 等服务前缀即可，程序会追加 `/chat/completions`。使用其他服务商时同时修改地址与模型名。

### 开启普通用户注册

新用户必须完成邮件验证。填写以下 SMTP 参数后，用户即可注册并收到验证链接：

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your_smtp_account
SMTP_PASS=your_smtp_authorization_code
EMAIL_FROM=your_sender@example.com
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

当前实现使用**隐式 TLS**，通常为 465 端口，不支持直接配置为 587 STARTTLS。部分服务需要 SMTP 授权码；发件地址应由服务商授权。线上部署时将 `NEXT_PUBLIC_APP_URL` 改为实际 HTTPS 地址。

完整配置见 [`.env.example`](.env.example) 和 [配置说明](docs/configuration.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run setup` | 生成本地随机密钥和管理员密码 |
| `npm run dev` | 开发服务，默认端口 5000 |
| `npm test` | 配置安全测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | 构建生产版本 |
| `npm run smoke` | 构建后验证生产登录、记餐、汇总和删除，使用临时 SQLite，不调用 AI / SMTP |
| `npm start` | 启动生产版本，默认端口 5000 |

生产构建也需要有效密钥；数据库在首次实际查询时初始化。`/healthz` 和 `/api/healthz` 仅检查 HTTP 进程，不检查数据库、邮件或模型连通性。

## 自部署与结构

详见 [自部署指南](docs/deployment.md)，包含 systemd、Nginx、HTTPS、数据库及排错说明。项目可独立部署，历史域名不作为可用演示承诺。

```text
app/                    页面与 API：登录、仪表盘、管理员后台
lib/server/             数据库、会话、邮件、AI 和餐食逻辑
lib/api.ts              浏览器端 API 请求封装
public/                 图标与 Web App Manifest
db/schema.sql           参考结构；运行时以 lib/server/db.ts 为准
scripts/setup.mjs       本地配置生成器
test/                   配置安全测试
docs/                   配置与部署说明
archive/legacy-python/  历史 Flask 实现
```

SQLite 数据文件默认为 `db/local.sqlite`，首次使用时自动创建。更改 `DATABASE_URL` 不会自动迁移已有数据。

## 数据流与使用边界

- API Key、会话密钥、数据库连接信息仅用于服务端；不要放入 `NEXT_PUBLIC_*` 变量或提交到 Git。
- AI 记餐会将餐食描述发给配置的模型服务；AI 总结还会发送当天饮食和部分身体资料。SMTP 服务会收到验证邮件收件地址，使用前应了解服务商的数据政策。
- 营养数值是模型估算，可能有误差，用于个人饮食记录，不能替代专业营养评估或医疗建议。
- 项目适合小型自部署，尚无完善的登录限流、配额与滥用防护；面向公众运行时需补充访问控制。

## 参与和许可

欢迎提交 [Issue](https://github.com/mmy5067/nutrition_app/issues) 或 PR。请阅读 [贡献指南](CONTRIBUTING.md)，安全问题按 [安全说明](SECURITY.md) 私下报告。

代码按 [MIT License](LICENSE) 开源，第三方依赖和模型服务仍遵循各自的许可证与条款。
