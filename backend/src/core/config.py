from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="HH_")

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Qdrant ---
    qdrant_url: str = ":memory:"
    qdrant_api_key: str = ""

    # --- Observability ---
    otlp_endpoint: str = ""
    prometheus_multiproc_dir: str = "/tmp/prometheus_multiproc"

    # --- Vault ---
    vault_addr: str = ""
    vault_token: str = ""

    # --- API ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:8081,http://localhost:3000"
    log_level: str = "info"

    # --- Celery ---
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
