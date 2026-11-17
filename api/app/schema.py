
from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Babies ─────────────────────────────────────────────

class BabyCreate(BaseModel):
    name: str
    date_of_birth: Optional[date] = None


class BabyOut(ORMModel):
    id: int
    name: str
    date_of_birth: Optional[date]
    is_active: bool


# ── Activity options ───────────────────────────────────

class EntryOptionCreate(BaseModel):
    name: str
    sort_order: int = 0


class EntryOptionUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class EntryOptionOut(ORMModel):
    id: int
    name: str
    sort_order: int
    is_active: bool


# ── Activities ────────────────────────────────────────

class EntryTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    options_have_times: bool = False
    has_duration: bool = False
    sort_order: int = 100
    options: List[EntryOptionCreate] = Field(default_factory=list)


class EntryTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    options_have_times: Optional[bool] = None
    has_duration: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class EntryTypeOut(ORMModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    icon: Optional[str]
    is_active: bool
    options_have_times: bool
    has_duration: bool
    sort_order: int
    options: List[EntryOptionOut] = Field(default_factory=list)


# ── Selected options ──────────────────────────────────

class EntryOptionSelectionCreate(BaseModel):
    option_id: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    sort_order: int = 0


class EntryOptionSelectionOut(BaseModel):
    id: int
    option_id: int
    name: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    sort_order: int


# ── Entries ───────────────────────────────────────────

class EntryCreate(BaseModel):
    baby_id: int = 1
    entry_type_id: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    selections: List[EntryOptionSelectionCreate] = Field(
        default_factory=list
    )


class EntryUpdate(BaseModel):
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    selections: Optional[List[EntryOptionSelectionCreate]] = None


class EntryOut(BaseModel):
    id: int
    baby_id: int
    entry_type: EntryTypeOut
    started_at: datetime
    ended_at: Optional[datetime] = None
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    selections: List[EntryOptionSelectionOut] = Field(
        default_factory=list
    )
