
from typing import List
from datetime import datetime, timezone
import re

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload, selectinload

from .db import get_db
from .models import (
    Baby,
    Entry,
    EntryType,
    EntryOption,
    EntryOptionSelection
)
from .schema import (
    BabyCreate,
    BabyOut,
    EntryTypeCreate,
    EntryTypeUpdate,
    EntryTypeOut,
    EntryOptionCreate,
    EntryOptionUpdate,
    EntryOptionOut,
    EntryCreate,
    EntryUpdate,
    EntryOut
)


app = FastAPI(
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────

def utc_now():
    return datetime.now(timezone.utc)


def make_slug(name):
    return re.sub(
        r'-+',
        '-',
        re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    )


def load_entry(entry_id: int, db: Session) -> Entry:
    entry = (
        db.query(Entry)
        .options(
            joinedload(Entry.entry_type)
            .selectinload(EntryType.options),
            selectinload(Entry.selections)
            .joinedload(EntryOptionSelection.option)
        )
        .filter(Entry.id == entry_id)
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Entry not found"
        )

    return entry


def entry_output(entry: Entry) -> dict:
    return {
        "id": entry.id,
        "baby_id": entry.baby_id,
        "entry_type": entry.entry_type,
        "started_at": entry.started_at,
        "ended_at": entry.ended_at,
        "notes": entry.notes,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
        "selections": [
            {
                "id": selection.id,
                "option_id": selection.option_id,
                "name": selection.option.name,
                "started_at": selection.started_at,
                "ended_at": selection.ended_at,
                "sort_order": selection.sort_order
            }
            for selection in entry.selections
        ]
    }



def validate_selections(entry_type, selections):
    for selection in selections:
        option = next(
            (
                option for option in entry_type.options
                if option.id == selection.option_id
                and option.is_active
            ),
            None
        )

        if not option:
            raise HTTPException(
                status_code=400,
                detail="Invalid option for this activity"
            )

        # Activities without individually timed actions,
        # such as nappy changes, cannot have action times.
        if not entry_type.options_have_times:
            if selection.started_at is not None or selection.ended_at is not None:
                raise HTTPException(
                    status_code=400,
                    detail="This activity does not use individual action times"
                )

        # Timed activities allow either, both or neither time.
        if (
            selection.started_at
            and selection.ended_at
            and selection.ended_at < selection.started_at
        ):
            raise HTTPException(
                status_code=400,
                detail=f"End time cannot precede start time for {option.name}"
            )


# ── Health ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Babies ─────────────────────────────────────────────

@app.get("/babies", response_model=List[BabyOut])
def get_babies(db: Session = Depends(get_db)):
    return (
        db.query(Baby)
        .filter(Baby.is_active == True)
        .order_by(Baby.name)
        .all()
    )


@app.post("/babies", response_model=BabyOut, status_code=201)
def create_baby(
    data: BabyCreate,
    db: Session = Depends(get_db)
):
    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    baby = Baby(
        name=name,
        date_of_birth=data.date_of_birth
    )

    db.add(baby)
    db.commit()
    db.refresh(baby)

    return baby


# ── Activities ─────────────────────────────────────────

@app.get("/entry-types", response_model=List[EntryTypeOut])
def get_entry_types(db: Session = Depends(get_db)):
    return (
        db.query(EntryType)
        .options(selectinload(EntryType.options))
        .filter(EntryType.is_active == True)
        .order_by(EntryType.sort_order, EntryType.name)
        .all()
    )


@app.post(
    "/entry-types",
    response_model=EntryTypeOut,
    status_code=201
)
def create_entry_type(
    data: EntryTypeCreate,
    db: Session = Depends(get_db)
):
    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Activity name is required"
        )

    slug = make_slug(name)

    if not slug:
        raise HTTPException(
            status_code=400,
            detail="Activity name must contain letters or numbers"
        )

    if db.query(EntryType).filter(
        EntryType.slug == slug
    ).first():
        raise HTTPException(
            status_code=409,
            detail="An activity with this name already exists"
        )

    entry_type = EntryType(
        name=name,
        slug=slug,
        description=data.description,
        icon=data.icon,
        options_have_times=data.options_have_times,
        has_duration=data.has_duration,
        sort_order=data.sort_order
    )

    db.add(entry_type)
    db.flush()

    for option in data.options:
        option_name = option.name.strip()

        if not option_name:
            raise HTTPException(
                status_code=400,
                detail="Option names cannot be empty"
            )

        entry_type.options.append(
            EntryOption(
                name=option_name,
                sort_order=option.sort_order
            )
        )

    db.commit()

    return (
        db.query(EntryType)
        .options(selectinload(EntryType.options))
        .filter(EntryType.id == entry_type.id)
        .first()
    )


# ── Activity updates ───────────────────────────────────

@app.patch(
    "/entry-types/{type_id}",
    response_model=EntryTypeOut
)
def update_entry_type(
    type_id: int,
    data: EntryTypeUpdate,
    db: Session = Depends(get_db)
):
    entry_type = (
        db.query(EntryType)
        .options(selectinload(EntryType.options))
        .filter(EntryType.id == type_id)
        .first()
    )

    if not entry_type:
        raise HTTPException(
            status_code=404,
            detail="Activity not found"
        )

    changes = data.model_dump(exclude_unset=True)

    if "name" in changes:
        name = changes["name"].strip()

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Activity name is required"
            )

        entry_type.name = name

    for field in (
        "description",
        "icon",
        "options_have_times",
        "has_duration",
        "sort_order",
        "is_active"
    ):
        if field in changes:
            setattr(entry_type, field, changes[field])

    db.commit()
    db.refresh(entry_type)

    return entry_type


# ── Activity options ───────────────────────────────────

@app.post(
    "/entry-types/{type_id}/options",
    response_model=EntryOptionOut,
    status_code=201
)
def create_option(
    type_id: int,
    data: EntryOptionCreate,
    db: Session = Depends(get_db)
):
    entry_type = db.query(EntryType).filter(
        EntryType.id == type_id,
        EntryType.is_active == True
    ).first()

    if not entry_type:
        raise HTTPException(
            status_code=404,
            detail="Activity not found"
        )

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Option name is required"
        )

    existing = db.query(EntryOption).filter(
        EntryOption.entry_type_id == type_id,
        EntryOption.name.ilike(name)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This option already exists"
        )

    option = EntryOption(
        entry_type_id=type_id,
        name=name,
        sort_order=data.sort_order
    )

    db.add(option)
    db.commit()
    db.refresh(option)

    return option


@app.patch(
    "/entry-types/{type_id}/options/{option_id}",
    response_model=EntryOptionOut
)
def update_option(
    type_id: int,
    option_id: int,
    data: EntryOptionUpdate,
    db: Session = Depends(get_db)
):
    option = db.query(EntryOption).filter(
        EntryOption.id == option_id,
        EntryOption.entry_type_id == type_id
    ).first()

    if not option:
        raise HTTPException(
            status_code=404,
            detail="Option not found"
        )

    changes = data.model_dump(exclude_unset=True)

    if "name" in changes:
        name = changes["name"].strip()

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Option name is required"
            )

        duplicate = db.query(EntryOption).filter(
            EntryOption.entry_type_id == type_id,
            EntryOption.name.ilike(name),
            EntryOption.id != option_id
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="This option already exists"
            )

        option.name = name

    for field in ("sort_order", "is_active"):
        if field in changes:
            setattr(option, field, changes[field])

    db.commit()
    db.refresh(option)

    return option


# ── Entries ────────────────────────────────────────────

@app.get("/entries", response_model=List[EntryOut])
def get_entries(
    baby_id: int = 1,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    entries = (
        db.query(Entry)
        .options(
            joinedload(Entry.entry_type)
            .selectinload(EntryType.options),
            selectinload(Entry.selections)
            .joinedload(EntryOptionSelection.option)
        )
        .filter(Entry.baby_id == baby_id)
        .order_by(Entry.started_at.desc())
        .limit(min(max(limit, 1), 500))
        .all()
    )

    return [
        entry_output(entry)
        for entry in entries
    ]


@app.get("/entries/{entry_id}", response_model=EntryOut)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db)
):
    return entry_output(load_entry(entry_id, db))


@app.post(
    "/entries",
    response_model=EntryOut,
    status_code=201
)
def create_entry(
    data: EntryCreate,
    db: Session = Depends(get_db)
):
    baby = db.query(Baby).filter(
        Baby.id == data.baby_id,
        Baby.is_active == True
    ).first()

    if not baby:
        raise HTTPException(
            status_code=404,
            detail="Baby not found"
        )

    entry_type = (
        db.query(EntryType)
        .options(selectinload(EntryType.options))
        .filter(
            EntryType.id == data.entry_type_id,
            EntryType.is_active == True
        )
        .first()
    )

    if not entry_type:
        raise HTTPException(
            status_code=404,
            detail="Activity not found"
        )

    validate_selections(entry_type, data.selections)

    entry = Entry(
        baby_id=data.baby_id,
        entry_type_id=data.entry_type_id,
        started_at=data.started_at or utc_now(),
        ended_at=data.ended_at,
        notes=data.notes
    )

    db.add(entry)
    db.flush()


    for selection in data.selections:
        db.add(
            EntryOptionSelection(
                entry_id=entry.id,
                option_id=selection.option_id,
                started_at=selection.started_at,
                ended_at=selection.ended_at,
                sort_order=selection.sort_order
            )
        )


    db.commit()

    return entry_output(load_entry(entry.id, db))


@app.patch(
    "/entries/{entry_id}",
    response_model=EntryOut
)
def update_entry(
    entry_id: int,
    data: EntryUpdate,
    db: Session = Depends(get_db)
):
    entry = load_entry(entry_id, db)

    changes = data.model_dump(exclude_unset=True)

    if "started_at" in changes:
        if changes["started_at"] is None:
            raise HTTPException(
                status_code=400,
                detail="Entry time cannot be empty"
            )

        entry.started_at = changes["started_at"]

    if "ended_at" in changes:
        entry.ended_at = changes["ended_at"]

    if "notes" in changes:
        entry.notes = changes["notes"]

    if "selections" in changes and data.selections is not None:
        validate_selections(
            entry.entry_type,
            data.selections
        )

        # Replace all existing selections.
        entry.selections.clear()
        db.flush()

        for selection in data.selections:
            entry.selections.append(
                EntryOptionSelection(
                    option_id=selection.option_id,
                    started_at=selection.started_at,
                    ended_at=selection.ended_at,
                    sort_order=selection.sort_order
                )
            )


    entry.updated_at = utc_now()

    db.commit()

    return entry_output(load_entry(entry_id, db))


@app.delete(
    "/entries/{entry_id}",
    status_code=204
)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db)
):
    entry = db.query(Entry).filter(
        Entry.id == entry_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Entry not found"
        )

    db.delete(entry)
    db.commit()
