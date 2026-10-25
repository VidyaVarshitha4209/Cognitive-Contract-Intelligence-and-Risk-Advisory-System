from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.models import User

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/ai-status")
def ai_status(_: User = Depends(get_current_user)):
    """Tells the frontend whether AI features are available. Never returns the key itself."""
    provider = settings.ai_provider.lower()
    if provider == "gemini":
        configured = bool(settings.gemini_api_key) and not settings.gemini_api_key.startswith("your-")
    elif provider == "mock":
        configured = True
    else:
        configured = False
    message = {
        True: "AI provider is configured." if provider != "mock"
              else "MOCK mode is ON: AI answers are fake test data.",
        False: "AI is not configured. Upload and text extraction still work. "
               "Set AI_PROVIDER and the API key in backend/.env to enable AI features.",
    }[configured]
    return {"provider": provider, "configured": configured, "mock": provider == "mock", "message": message}
