"""
Board (Project) and Card (Task) models for Kanban functionality
"""
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey, Table, Enum as SQLEnum, Column
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from typing import Optional, List
import enum

from app.core.database import Base


class CardPriority(str, enum.Enum):
    """Card priority enum"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class BoardStatus(str, enum.Enum):
    """Board (Project) status enum"""
    PLANNING = "planning"  # Планирование
    IN_PROGRESS = "in_progress"  # В работе
    ON_HOLD = "on_hold"  # Приостановлен
    COMPLETED = "completed"  # Завершен
    CANCELLED = "cancelled"  # Отменен
    FAILED = "failed"  # Неудачный


# Association table for card assignees
card_assignees = Table(
    "card_assignees",
    Base.metadata,
    Column("card_id", Integer, ForeignKey("cards.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"))
)

# Association table for card tags
card_tags = Table(
    "card_tags",
    Base.metadata,
    Column("card_id", Integer, ForeignKey("cards.id", ondelete="CASCADE")),
    Column("tag", String)
)


class Board(Base):
    """Board (Project) model"""
    __tablename__ = "boards"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(SQLEnum(BoardStatus), default=BoardStatus.PLANNING, nullable=False)
    color: Mapped[str] = mapped_column(String, default="#3B82F6")  # Tailwind blue-500
    
    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_boards", foreign_keys=[owner_id])
    columns: Mapped[List["Column"]] = relationship("Column", back_populates="board", cascade="all, delete-orphan", order_by="Column.position")
    
    def __repr__(self):
        return f"<Board {self.title}>"


class Column(Base):
    """Column model for Kanban board"""
    __tablename__ = "columns"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    board_id: Mapped[int] = mapped_column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String, default="#6B7280")  # Tailwind gray-500
    
    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    board: Mapped["Board"] = relationship("Board", back_populates="columns")
    cards: Mapped[List["Card"]] = relationship("Card", back_populates="column", cascade="all, delete-orphan", order_by="Card.position")
    
    def __repr__(self):
        return f"<Column {self.title}>"


class Card(Base):
    """Card (Task) model"""
    __tablename__ = "cards"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    column_id: Mapped[int] = mapped_column(Integer, ForeignKey("columns.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    
    # Task details
    priority: Mapped[CardPriority] = mapped_column(SQLEnum(CardPriority), default=CardPriority.MEDIUM)
    due_date: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Links
    contact_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("contacts.id"), nullable=True)
    
    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    column: Mapped["Column"] = relationship("Column", back_populates="cards")
    assignees: Mapped[List["User"]] = relationship("User", secondary=card_assignees, back_populates="assigned_cards")
    comments: Mapped[List["CardComment"]] = relationship("CardComment", back_populates="card", cascade="all, delete-orphan")
    checklists: Mapped[List["CardChecklist"]] = relationship("CardChecklist", back_populates="card", cascade="all, delete-orphan")
    files: Mapped[List["File"]] = relationship("File", back_populates="card", cascade="all, delete-orphan")
    contact: Mapped[Optional["Contact"]] = relationship("Contact", back_populates="cards")
    
    def __repr__(self):
        return f"<Card {self.title}>"


class CardComment(Base):
    """Card comment model"""
    __tablename__ = "card_comments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    card_id: Mapped[int] = mapped_column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Confirmation status
    status: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # 'accepted', 'rejected', or None
    status_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Reason for rejection
    status_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    card: Mapped["Card"] = relationship("Card", back_populates="comments")
    author: Mapped["User"] = relationship("User", back_populates="comments", foreign_keys=[author_id])
    status_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[status_by_id])
    
    def __repr__(self):
        return f"<CardComment {self.id}>"


class CardChecklist(Base):
    """Card checklist model"""
    __tablename__ = "card_checklists"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    card_id: Mapped[int] = mapped_column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    card: Mapped["Card"] = relationship("Card", back_populates="checklists")
    items: Mapped[List["CardChecklistItem"]] = relationship("CardChecklistItem", back_populates="checklist", cascade="all, delete-orphan", order_by="CardChecklistItem.position")
    
    def __repr__(self):
        return f"<CardChecklist {self.title}>"


class CardChecklistItem(Base):
    """Checklist item model"""
    __tablename__ = "card_checklist_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    checklist_id: Mapped[int] = mapped_column(Integer, ForeignKey("card_checklists.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    checklist: Mapped["CardChecklist"] = relationship("CardChecklist", back_populates="items")
    
    def __repr__(self):
        return f"<CardChecklistItem {self.title}>"

