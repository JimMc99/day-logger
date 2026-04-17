from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .db import get_db
from .models import Entry, Tag, TagCategory, EntryAndTag
from .schema import (
    EntryCreate, EntryUpdate, EntryOut,
    TagCreate, TagOut,
    TagCategoryOut,
    EntryAndTagCreate, EntryAndTagOut,
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
            joinedload(Entry.tags)
            .joinedload(EntryAndTag.tag)
            .joinedload(Tag.category)
        )
        .filter(Entry.id == entry_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


# ── Categories ─────────────────────────────────────────────────────────────────

@app.get("/categories", response_model=List[TagCategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(TagCategory).order_by(TagCategory.name).all()


# ── Tags ───────────────────────────────────────────────────────────────────────

@app.get("/tags", response_model=List[TagOut])
def get_tags(db: Session = Depends(get_db)):
    return (
        db.query(Tag)
        .options(joinedload(Tag.category))
        .order_by(Tag.name)
        .all()
    )


@app.post("/tags", response_model=TagOut, status_code=201)
def create_tag(tag: TagCreate, db: Session = Depends(get_db)):
    if not db.query(TagCategory).filter(TagCategory.id == tag.category_id).first():
        raise HTTPException(status_code=404, detail="Category not found")
    existing = (
        db.query(Tag)
        .filter(
            func.lower(Tag.name) == tag.name.lower(),
            Tag.category_id == tag.category_id,
        )
        .first()
    )
    if existing:
        return (
            db.query(Tag)
            .options(joinedload(Tag.category))
            .filter(Tag.id == existing.id)
            .first()
        )
    db_tag = Tag(name=tag.name, category_id=tag.category_id)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return (
        db.query(Tag)
        .options(joinedload(Tag.category))
        .filter(Tag.id == db_tag.id)
        .first()
    )


@app.delete("/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()


@app.get("/tags/popular", response_model=List[TagOut])
def get_popular_tags(limit: int = 8, db: Session = Depends(get_db)):
    top_ids = (
        db.query(EntryAndTag.tag_id)
        .group_by(EntryAndTag.tag_id)
        .order_by(func.count(EntryAndTag.id).desc())
        .limit(limit)
        .all()
    )
    id_list = [row[0] for row in top_ids]
    if not id_list:
        return []
    tags = (
        db.query(Tag)
        .options(joinedload(Tag.category))
        .filter(Tag.id.in_(id_list))
        .all()
    )
    order = {tid: i for i, tid in enumerate(id_list)}
    return sorted(tags, key=lambda t: order[t.id])


# ── Entries ────────────────────────────────────────────────────────────────────

@app.get("/entries", response_model=List[EntryOut])
def get_entries(db: Session = Depends(get_db)):
    return (
        db.query(Entry)
        .options(
            joinedload(Entry.tags)
            .joinedload(EntryAndTag.tag)
            .joinedload(Tag.category)
        )
        .order_by(Entry.timestamp.desc())
        .all()
    )


@app.get("/entries/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    return load_entry(entry_id, db)


@app.post("/entries", response_model=EntryOut, status_code=201)
def create_entry(entry: EntryCreate, db: Session = Depends(get_db)):
    db_entry = Entry(title=entry.title, timestamp=entry.timestamp)
    db.add(db_entry)
    db.flush()

    for et in (entry.tags or []):
        tag = db.query(Tag).filter(Tag.id == et.tag_id).first()
        if not tag:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Tag {et.tag_id} not found")
        link = EntryAndTag(
            entry_id=db_entry.id,
            tag_id=et.tag_id,
            detail=et.detail,
        )
        db.add(link)

    db.commit()
    return load_entry(db_entry.id, db)


@app.patch("/entries/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: int, data: EntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if data.title is not None:
        entry.title = data.title
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


# ── Entry tags ─────────────────────────────────────────────────────────────────

@app.post("/entries/{entry_id}/tags", response_model=EntryAndTagOut, status_code=201)
def add_tag_to_entry(entry_id: int, data: EntryAndTagCreate, db: Session = Depends(get_db)):
    if not db.query(Entry).filter(Entry.id == entry_id).first():
        raise HTTPException(status_code=404, detail="Entry not found")
    if not db.query(Tag).filter(Tag.id == data.tag_id).first():
        raise HTTPException(status_code=404, detail="Tag not found")
    link = EntryAndTag(entry_id=entry_id, tag_id=data.tag_id, detail=data.detail)
    db.add(link)
    db.commit()
    db.refresh(link)
    return (
        db.query(EntryAndTag)
        .options(joinedload(EntryAndTag.tag).joinedload(Tag.category))
        .filter(EntryAndTag.id == link.id)
        .first()
    )


@app.delete("/entries/{entry_id}/tags/{entry_tag_id}", status_code=204)
def remove_tag_from_entry(entry_id: int, entry_tag_id: int, db: Session = Depends(get_db)):
    link = db.query(EntryAndTag).filter(
        EntryAndTag.id == entry_tag_id,
        EntryAndTag.entry_id == entry_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Entry tag not found")
    db.delete(link)
    db.commit()
