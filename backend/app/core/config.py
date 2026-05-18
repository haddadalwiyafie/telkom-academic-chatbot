import os

# Print available env var NAMES at startup (not values) for debugging
_all_keys = list(os.environ.keys())
print(f"[config] ALL env keys: {sorted(_all_keys)}", flush=True)


class Settings:
    # Renamed to avoid Railway reserved/filtered variable names
    cohere_api_key: str = os.environ.get("COHERE_TOKEN", "")
    database_url: str = os.environ.get("APP_DB_URL", "sqlite:////app/data/telkom.db")
    secret_key: str = os.environ.get("JWT_SECRET", "fallback-dev-secret")

    chroma_persist_path: str = os.environ.get("CHROMA_PERSIST_PATH", "./chroma_data")
    algorithm: str = os.environ.get("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    upload_dir: str = os.environ.get("UPLOAD_DIR", "./uploads")
    max_file_size_mb: int = int(os.environ.get("MAX_FILE_SIZE_MB", "50"))
    admin_email: str = os.environ.get("ADMIN_EMAIL", "admin@telkomuniversity.ac.id")
    admin_password: str = os.environ.get("ADMIN_PASSWORD", "changeme123")
    cors_origins: str = os.environ.get("CORS_ORIGINS", "http://localhost:3000")

    cohere_embed_model: str = "embed-multilingual-v3.0"
    cohere_chat_model: str = "command-r-plus-08-2024"
    chunk_size: int = 400
    chunk_overlap: int = 50
    top_k_retrieval: int = 6


settings = Settings()
