from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .db import Base


class TagCategory(Base):
    __tablename__ = 'tag_category'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    tags = relationship('Tag', back_populates='category')


class Tag(Base):
    __tablename__ = 'tag'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('tag_category.id'), nullable=False)
    category = relationship('TagCategory', back_populates='tags')
    entry_and_tags = relationship('EntryAndTag', back_populates='tag')


class Entry(Base):
    __tablename__ = 'entry'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    title = Column(Text, nullable=True)
    tags = relationship('EntryAndTag', back_populates='entry', cascade='all, delete-orphan')


class EntryAndTag(Base):
    __tablename__ = 'entry_and_tag'
    __table_args__ = (UniqueConstraint('entry_id', 'tag_id', name='uq_entry_and_tag'),)
    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey('entry.id'), nullable=False)
    tag_id = Column(Integer, ForeignKey('tag.id'), nullable=False)
    detail = Column(Text, nullable=True)
    entry = relationship('Entry', back_populates='tags')
    tag = relationship('Tag', back_populates='entry_and_tags')
