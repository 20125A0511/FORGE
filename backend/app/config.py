from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://forge:forge@localhost:5432/forge"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://forge:forge@localhost:5432/forge"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Anthropic / LLM (API requires prepaid credits — no free tier. Use Haiku for low-cost testing.)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"

    # Auth / JWT
    SECRET_KEY: str = "forge-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Twilio SMS
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""  # e.g. +15551234567

    # External APIs
    GOOGLE_MAPS_API_KEY: str = ""

    # Base URL for tracking links (frontend)
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # Application
    APP_NAME: str = "FORGE"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
