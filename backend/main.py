from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api import api_router
from app.services.policy_service import seed_default_policies

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    try:
        Base.metadata.create_all(bind=engine)
        print("[Database] Schema tables initialized successfully.")
    except Exception as e:
        print(f"[Database Error during create_all]: {e}")

    # Seed default policies
    db = SessionLocal()
    try:
        seed_default_policies(db)
        print("[Database] Default policies verified/seeded.")
    except Exception as e:
        print(f"[Database Error during policy seed]: {e}")
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Cognitive Contract Intelligence & Risk Advisory System REST APIs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "database_type": engine.dialect.name
    }

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "ai_provider": settings.AI_PROVIDER
    }

from fastapi import Depends
from app.api.deps import get_current_user
from app.models.user import User

@app.get(f"{settings.API_V1_STR}/settings/ai-status", tags=["Settings"])
def get_ai_status(current_user: User = Depends(get_current_user)):
    is_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    return {
        "configured": is_configured,
        "provider": settings.AI_PROVIDER,
        "model": settings.GEMINI_MODEL
    }
