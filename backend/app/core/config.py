from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    cohere_api_key: str = Field(..., env="COHERE_API_KEY")
    database_url: str = Field(..., env="DATABASE_URL")
    chroma_persist_path: str = Field("./chroma_data", env="CHROMA_PERSIST_PATH")

    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field("HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(60, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    upload_dir: str = Field("./uploads", env="UPLOAD_DIR")
    max_file_size_mb: int = Field(50, env="MAX_FILE_SIZE_MB")

    admin_email: str = Field("admin@telkomuniversity.ac.id", env="ADMIN_EMAIL")
    admin_password: str = Field("changeme123", env="ADMIN_PASSWORD")

    # Comma-separated list of allowed CORS origins, e.g. "https://your-app.vercel.app,http://localhost:3000"
    cors_origins: str = Field("http://localhost:3000", env="CORS_ORIGINS")

    cohere_embed_model: str = "embed-multilingual-v3.0"
    cohere_chat_model: str = "command-r-plus-08-2024"
    chunk_size: int = 400       # approximate token count per chunk
    chunk_overlap: int = 50
    top_k_retrieval: int = 6    # documents to retrieve per query

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
