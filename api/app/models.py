from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .db import Base


class FactorCategory(Base):
    __tablename__ = 'factor_category'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    factors = relationship('Factor', back_populates='category')


class Factor(Base):
    __tablename__ = 'factor'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('factor_category.id'), nullable=False)

    category = relationship('FactorCategory', back_populates='factors')
    entry_and_factors = relationship('EntryAndFactor', back_populates='factor')
    

class Entry(Base):
    __tablename__ = 'entry'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    note = Column(Text, nullable=True)

    entry_and_factors = relationship('EntryAndFactor', back_populates='entry')


class EntryAndFactor(Base):
    __tablename__ = 'entry_and_factor'
    __table_args__ = (UniqueConstraint('entry_id', 'factor_id', name='uc_entry_factor'),)

    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey('entry.id'), nullable=False)
    factor_id = Column(Integer, ForeignKey('factor.id'), nullable=False)
    note = Column(Text, nullable=True)

    entry = relationship('Entry', back_populates='entry_and_factors')
    factor = relationship('Factor', back_populates='entry_and_factors')
