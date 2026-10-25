from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str

class ChatSource(BaseModel):
    clause_category: Optional[str] = None
    page_number: Optional[int] = 1
    snippet: str

class ChatResponse(BaseModel):
    id: str
    role: str
    content: str
    source_references: List[ChatSource] = []
    created_at: datetime

class ChatHistoryOut(BaseModel):
    messages: List[ChatResponse]
