from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, SessionLocal
from app.core.config import settings
from app.core.auth import hash_password
from app.models.models import Base, User
from app.api import auth, chat, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed first admin account
    _seed_admin()
    yield


def _seed_admin() -> None:
    db = SessionLocal()
    try:
        exists = db.query(User).filter(User.email == settings.admin_email).first()
        if not exists:
            db.add(
                User(
                    email=settings.admin_email,
                    password_hash=hash_password(settings.admin_password),
                    role="admin",
                )
            )
            db.commit()
    finally:
        db.close()


app = FastAPI(
    title="Telkom Academic Chatbot API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/debug/env")
def debug_env():
    import os
    keys = sorted(os.environ.keys())
    cohere_set = bool(os.environ.get("COHERE_TOKEN", ""))
    return {
        "all_keys": keys,
        "cohere_token_set": cohere_set,
        "cohere_token_prefix": os.environ.get("COHERE_TOKEN", "")[:8] or "EMPTY",
    }
