from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class PolicyBase(BaseModel):
    name: str
    category: str
    description: str
    expected_condition: str
    severity: str = "Medium"  # High, Medium, Low
    numeric_threshold: Optional[float] = None
    is_active: bool = True

class PolicyCreate(PolicyBase):
    pass

class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    expected_condition: Optional[str] = None
    severity: Optional[str] = None
    numeric_threshold: Optional[float] = None
    is_active: Optional[bool] = None

class PolicyOut(PolicyBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
