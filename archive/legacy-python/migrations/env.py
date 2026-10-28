# migrations/env.py
from __future__ import annotations

import sys
import pathlib
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

# 让 "from app ..." 能导入（migrations/ 的上一级就是项目根）
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

# 现在可以安全导入我们项目里的对象
from app.config import get_settings
from app import db  # db.metadata 用于 autogenerate
from app import models

# Alembic 基本配置对象
config = context.config

# 若启用了 alembic.ini 的日志配置，这里会加载
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 要监控的元数据（autogenerate 需要）
target_metadata = db.metadata


def get_url() -> str:
    """从我们的设置里拿数据库 URL。"""
    return get_settings().DATABASE_URL


def run_migrations_offline() -> None:
    """离线模式：不建立 DB 连接，直接输出 SQL。"""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,       # 对类型变化更敏感（推荐）
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式：建立 DB 连接并执行迁移。"""
    connectable = create_engine(
        get_url(),
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
