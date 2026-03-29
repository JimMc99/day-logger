from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class EntryCreate(BaseModel):
    note: str
    timestamp: Optional[datetime] = None


class FactorCreate(BaseModel):
    name: str
    category_id: int


class EntryOut(BaseModel):
    id: int
    note: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class FactorOut(BaseModel):
    id: int
    name: str
    category_id: int

    class Config:
        from_attributes = True
