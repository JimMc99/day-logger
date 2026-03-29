from typing import List

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session, joinedload
from .db import get_db
from .models import Entry, Factor, EntryAndFactor
from .schema import EntryCreate, EntryOut, FactorCreate, FactorOut

app = FastAPI(docs_url=None, redoc_url=None)

@app.get("/")
def welcome():
    return {'message': 'Welcome to your Day Logger!'}

@app.get('/entries', response_model=List[EntryOut])
def get_entries(db: Session = Depends(get_db)):
    return (db
        .query(Entry)
        .options(
            joinedload(Entry.entry_and_factors)
            .joinedload(EntryAndFactor.factor)
            .joinedload(Factor.category)
        ).all())

@app.get('/factors', response_model=List[FactorOut])
def get_factors(db: Session = Depends(get_db)):
    return (db
        .query(Factor)
        .options(joinedload(Factor.category))
        .all())

@app.post('/entries', response_model=EntryOut)
def create_entry(entry: EntryCreate, db: Session = Depends(get_db)):
    db_entry = Entry(**entry.model_dump(exclude_none=True))
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.post('/factors', response_model=FactorOut)
def create_factor(factor: FactorCreate, db: Session = Depends(get_db)):
    db_factor = Factor(name=factor.name, category_id=factor.category_id)
    db.add(db_factor)
    db.commit()
    db.refresh(db_factor)
    return db_factor
