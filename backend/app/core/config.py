from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Required — must be set via environment variables or .env
    cohere_api_key: str
    database_url: str
    secret_key: str

    # Optional with defaults
    chroma_persist_path: str = "./chroma_data"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50
    admin_email: str = "admin@telkomuniversity.ac.id"
    admin_password: str = "changeme123"
    cors_origins: str = "http://localhost:3000"

    cohere_embed_model: str = "embed-multilingual-v3.0"
    cohere_chat_model: str = "command-r-plus-08-2024"
    chunk_size: int = 400
    chunk_overlap: int = 50
    top_k_retrieval: int = 6


settings = Settings()
