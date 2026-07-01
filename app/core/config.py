from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    app_name: str = "ArcConnect API"
    debug: bool = False
    database_url: str = "sqlite:///./arcconnect.db"
    secret_key: str = os.getenv("SESSION_SECRET", "arcconnect-super-secret-key-change-in-prod")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
