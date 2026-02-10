from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_db_url(url: str, driver: str) -> str:
    """Ensure database URL uses the correct driver (asyncpg or psycopg2)."""
    if not url:
        return url
    if url.startswith("postgresql://") and f"postgresql+{driver}" not in url:
        return url.replace("postgresql://", f"postgresql+{driver}://", 1)
    return url


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # Database (Render gives postgresql://; we convert to postgresql+asyncpg / +psycopg2)
    DATABASE_URL: str = "postgresql+asyncpg://forge:forge@localhost:5432/forge"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://forge:forge@localhost:5432/forge"

    @property
    def database_url_async(self) -> str:
        return _normalize_db_url(self.DATABASE_URL, "asyncpg")

    @property
    def database_url_sync(self) -> str:
        return _normalize_db_url(self.DATABASE_URL_SYNC, "psycopg2")

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
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS string into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
