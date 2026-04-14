from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .db import get_db
from .models import Entry, Factor, FactorCategory, EntryAndFactor
from .schema import (
    EntryCreate, EntryUpdate, EntryOut,
    FactorCreate, FactorOut,
    FactorCategoryOut,
    EntryFactorCreate, EntryFactorOut,
)

app = FastAPI(docs_url="/docs", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_entry(entry_id: int, db: Session) -> Entry:
    entry = (
        db.query(Entry)
        .options(
            joinedload(Entry.factors)
            .joinedload(EntryAndFactor.factor)
            .joinedload(Factor.category)
        )
        .filter(Entry.id == entry_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


# ── Categories ─────────────────────────────────────────────────────────────────

@app.get("/categories", response_model=List[FactorCategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(FactorCategory).order_by(FactorCategory.name).all()


# ── Factors ────────────────────────────────────────────────────────────────────

@app.get("/factors", response_model=List[FactorOut])
def get_factors(db: Session = Depends(get_db)):
    return (
        db.query(Factor)
        .options(joinedload(Factor.category))
        .order_by(Factor.name)
        .all()
    )


@app.post("/factors", response_model=FactorOut, status_code=201)
def create_factor(factor: FactorCreate, db: Session = Depends(get_db)):
    if not db.query(FactorCategory).filter(FactorCategory.id == factor.category_id).first():
        raise HTTPException(status_code=404, detail="Category not found")

    # Return existing factor if name+category already exists (case-insensitive)
    existing = (
        db.query(Factor)
        .filter(
            func.lower(Factor.name) == factor.name.lower(),
            Factor.category_id == factor.category_id,
        )
        .first()
    )
    if existing:
        return (
            db.query(Factor)
            .options(joinedload(Factor.category))
            .filter(Factor.id == existing.id)
            .first()
        )

    db_factor = Factor(name=factor.name, category_id=factor.category_id)
    db.add(db_factor)
    db.commit()
    db.refresh(db_factor)
    return (
        db.query(Factor)
        .options(joinedload(Factor.category))
        .filter(Factor.id == db_factor.id)
        .first()
    )


@app.delete("/factors/{factor_id}", status_code=204)
def delete_factor(factor_id: int, db: Session = Depends(get_db)):
    factor = db.query(Factor).filter(Factor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=404, detail="Factor not found")
    db.delete(factor)
    db.commit()


# ── Entries ────────────────────────────────────────────────────────────────────

@app.get("/entries", response_model=List[EntryOut])
def get_entries(db: Session = Depends(get_db)):
    return (
        db.query(Entry)
        .options(
            joinedload(Entry.factors)
            .joinedload(EntryAndFactor.factor)
            .joinedload(Factor.category)
        )
        .order_by(Entry.timestamp.desc())
        .all()
    )


@app.get("/entries/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    return load_entry(entry_id, db)


@app.post("/entries", response_model=EntryOut, status_code=201)
def create_entry(entry: EntryCreate, db: Session = Depends(get_db)):
    db_entry = Entry(note=entry.note, timestamp=entry.timestamp)
    db.add(db_entry)
    db.flush()

    for ef in (entry.factors or []):
        factor = db.query(Factor).filter(Factor.id == ef.factor_id).first()
        if not factor:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Factor {ef.factor_id} not found")
        link = EntryAndFactor(
            entry_id=db_entry.id,
            factor_id=ef.factor_id,
            note=ef.note,
        )
        db.add(link)

    db.commit()
    return load_entry(db_entry.id, db)


@app.patch("/entries/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: int, data: EntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if data.note is not None:
        entry.note = data.note
    if data.timestamp is not None:
        entry.timestamp = data.timestamp
    db.commit()
    return load_entry(entry_id, db)


@app.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()


# ── Entry factors ──────────────────────────────────────────────────────────────

@app.post("/entries/{entry_id}/factors", response_model=EntryFactorOut, status_code=201)
def add_factor_to_entry(entry_id: int, data: EntryFactorCreate, db: Session = Depends(get_db)):
    if not db.query(Entry).filter(Entry.id == entry_id).first():
        raise HTTPException(status_code=404, detail="Entry not found")
    if not db.query(Factor).filter(Factor.id == data.factor_id).first():
        raise HTTPException(status_code=404, detail="Factor not found")
    link = EntryAndFactor(
        entry_id=entry_id,
        factor_id=data.factor_id,
        note=data.note,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return (
        db.query(EntryAndFactor)
        .options(joinedload(EntryAndFactor.factor).joinedload(Factor.category))
        .filter(EntryAndFactor.id == link.id)
        .first()
    )


@app.delete("/entries/{entry_id}/factors/{link_id}", status_code=204)
def remove_factor_from_entry(entry_id: int, link_id: int, db: Session = Depends(get_db)):
    link = db.query(EntryAndFactor).filter(
        EntryAndFactor.id == link_id,
        EntryAndFactor.entry_id == entry_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
