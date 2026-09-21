import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    FRONTEND_URL: str = "http://localhost:3000"
    DATABASE_URL: str = "sqlite:///./pulselog.db"

    JWT_ACCESS_SECRET: str
    JWT_REFRESH_SECRET: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    COOKIE_SECURE: bool = False
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET")
    @classmethod
    def validate_secrets(cls, value: str, info) -> str:
        if not value or not value.strip():
            raise ValueError(f"{info.field_name} must be provided and cannot be empty.")
        if value in ("replace_with_long_random_secret", "replace_with_different_long_random_secret"):
            raise ValueError(
                f"{info.field_name} contains unconfigured placeholder! "
                "Set a secure random secret in environment variables or .env."
            )
        return value

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
            # Also ensure frontend URL is included
            if self.FRONTEND_URL not in origins:
                origins.append(self.FRONTEND_URL)
            return origins
        return ["http://localhost:3000"]


_settings_instance = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance
