from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class TagCategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TagCreate(BaseModel):
    name: str
    category_id: int


class TagOut(BaseModel):
    id: int
    name: str
    category: TagCategoryOut

    class Config:
        from_attributes = True


class EntryTagCreate(BaseModel):
    tag_id: int
    detail: Optional[str] = None


class EntryTagOut(BaseModel):
    id: int
    tag: TagOut
    detail: Optional[str]

    class Config:
        from_attributes = True


class EntryCreate(BaseModel):
    title: Optional[str] = None
    timestamp: Optional[datetime] = None
    tags: Optional[List[EntryTagCreate]] = []


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    timestamp: Optional[datetime] = None


class EntryOut(BaseModel):
    id: int
    title: Optional[str]
    timestamp: datetime
    tags: List[EntryTagOut] = []

    class Config:
        from_attributes = True
