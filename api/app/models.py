
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    Date, DateTime, ForeignKey, UniqueConstraint,
    CheckConstraint, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from .db import Base


def utc_now():
    return datetime.now(timezone.utc)


class Baby(Base):
    __tablename__ = 'baby'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    entries = relationship(
        'Entry',
        back_populates='baby',
        cascade='all, delete-orphan'
    )


class EntryType(Base):
    __tablename__ = 'entry_type'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    has_segments = Column(Boolean, default=False, nullable=False)
    options_have_times = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    fields = relationship(
        'EntryField',
        back_populates='entry_type',
        cascade='all, delete-orphan'
    )

    options = relationship(
        'EntryOption',
        back_populates='entry_type',
        cascade='all, delete-orphan',
        order_by='EntryOption.sort_order'
    )

    entries = relationship('Entry', back_populates='entry_type')


class EntryField(Base):
    __tablename__ = 'entry_field'

    id = Column(Integer, primary_key=True)

    entry_type_id = Column(
        Integer,
        ForeignKey('entry_type.id', ondelete='CASCADE'),
        nullable=False
    )

    name = Column(String(100), nullable=False)
    label = Column(String(100), nullable=False)
    field_type = Column(String(50), nullable=False)
    is_required = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    entry_type = relationship(
        'EntryType',
        back_populates='fields'
    )

class EntryOption(Base):
    __tablename__ = 'entry_option'
    __table_args__ = (
        UniqueConstraint(
            'entry_type_id',
            'name',
            name='uq_entry_option_name'
        ),
    )

    id = Column(Integer, primary_key=True)
    entry_type_id = Column(
        Integer,
        ForeignKey('entry_type.id', ondelete='CASCADE'),
        nullable=False
    )
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    entry_type = relationship('EntryType', back_populates='options')

    selections = relationship(
        'EntryOptionSelection',
        back_populates='option'
    )


class Entry(Base):
    __tablename__ = 'entry'

    id = Column(Integer, primary_key=True)

    baby_id = Column(
        Integer,
        ForeignKey('baby.id', ondelete='CASCADE'),
        nullable=False
    )

    entry_type_id = Column(
        Integer,
        ForeignKey('entry_type.id'),
        nullable=False
    )

    started_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )

    ended_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False
    )

    baby = relationship('Baby', back_populates='entries')
    entry_type = relationship('EntryType', back_populates='entries')

    selections = relationship(
        'EntryOptionSelection',
        back_populates='entry',
        cascade='all, delete-orphan',
        order_by='EntryOptionSelection.sort_order'
    )


class EntryOptionSelection(Base):
    __tablename__ = 'entry_option_selection'

    id = Column(Integer, primary_key=True)

    entry_id = Column(
        Integer,
        ForeignKey('entry.id', ondelete='CASCADE'),
        nullable=False
    )

    option_id = Column(
        Integer,
        ForeignKey('entry_option.id'),
        nullable=False
    )

    selected_at = Column(DateTime(timezone=True), nullable=True)

    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )

    entry = relationship('Entry', back_populates='selections')

    option = relationship('EntryOption', back_populates='selections')
