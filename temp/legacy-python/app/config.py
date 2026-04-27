# app/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # 基础配置
    SECRET_KEY: str = "dev"
    DATABASE_URL: str
    FRONTEND_URL: str = "http://127.0.0.1:3000"

    # 第三方大模型参数（可选）
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str | None = None
    MODEL_NAME: str | None = None

    # 开发开关
    FLASK_DEBUG: int = 0

    # v2 写法：指定 .env 文件、忽略多余变量
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
