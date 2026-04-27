# Nutrition App

当前仓库已经改成纯 `Next.js` 技术栈：

- `app/`：App Router 页面和 Route Handlers
- `lib/`：前后端共用工具、数据库和鉴权封装
- `db/schema.sql`：PostgreSQL 初始化结构
- `temp/legacy-python/`：迁移前的 Flask / Alembic / 模板代码存档

## 环境变量

复制 `.env.example` 到 `.env`，填写：

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/nutriapp
SECRET_KEY=change_me_to_a_random_long_value
OPENAI_API_KEY=
OPENAI_BASE_URL=
MODEL_NAME=gpt-4o-mini
```

## 运行方式

```bash
npm install
npm run dev
```

默认访问：

- 前端页面：`http://127.0.0.1:3000`
- 健康检查：`http://127.0.0.1:3000/healthz`

## 当前后端能力

- 邮箱注册 / 登录 / 退出登录
- 基于 httpOnly cookie 的会话
- 个人档案读写
- 饮食记录增删查、每日汇总
- AI 录餐和 AI 每日总结

## 说明

- 旧 Python 代码已经移到 `temp/legacy-python/`，主工程不再依赖 Flask。
- 注册逻辑已简化，不再要求邀请码，也不兼容旧密码哈希。
