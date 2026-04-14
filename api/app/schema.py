from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class FactorCategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class FactorCreate(BaseModel):
    name: str
    category_id: int


class FactorOut(BaseModel):
    id: int
    name: str
    category: FactorCategoryOut

    class Config:
        from_attributes = True


class EntryFactorCreate(BaseModel):
    factor_id: int
    note: Optional[str] = None


class EntryFactorOut(BaseModel):
    id: int
    factor: FactorOut
    note: Optional[str]

    class Config:
        from_attributes = True


class EntryCreate(BaseModel):
    note: Optional[str] = None
    timestamp: Optional[datetime] = None
    factors: Optional[List[EntryFactorCreate]] = []


class EntryUpdate(BaseModel):
    note: Optional[str] = None
    timestamp: Optional[datetime] = None


class EntryOut(BaseModel):
    id: int
    note: Optional[str]
    timestamp: datetime
    factors: List[EntryFactorOut] = []

    class Config:
        from_attributes = True
