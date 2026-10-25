from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.contracts import router as contracts_router
from app.api.policies import router as policies_router
from app.api.risks import router as risks_router
from app.api.chat import router as chat_router
from app.api.compare import router as compare_router
from app.api.reports import router as reports_router
from app.api.dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(contracts_router)
api_router.include_router(policies_router)
api_router.include_router(risks_router)
api_router.include_router(chat_router)
api_router.include_router(compare_router)
api_router.include_router(reports_router)
api_router.include_router(dashboard_router)
