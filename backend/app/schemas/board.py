"""
Board, Column, and Card schemas
"""
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.board import CardPriority
from app.schemas.user import User

if TYPE_CHECKING:
    from app.schemas.file import File as FileSchema
    from app.schemas.board import Comment as CommentSchema
else:
    FileSchema = "File"
    CommentSchema = "Comment"


# Board schemas
class BoardBase(BaseModel):
    """Base board schema"""
    title: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    status: str = "planning"


class BoardCreate(BoardBase):
    """Schema for creating board"""
    pass


class BoardUpdate(BaseModel):
    """Schema for updating board"""
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_archived: Optional[bool] = None
    status: Optional[str] = None


class BoardInDB(BoardBase):
    """Schema for board in database"""
    id: int
    owner_id: int
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Board(BoardInDB):
    """Schema for board response"""
    owner: User
    

# Column schemas
class ColumnBase(BaseModel):
    """Base column schema"""
    title: str
    color: str = "#6B7280"


class ColumnCreate(ColumnBase):
    """Schema for creating column"""
    board_id: int
    position: int = 0


class ColumnUpdate(BaseModel):
    """Schema for updating column"""
    title: Optional[str] = None
    position: Optional[int] = None
    color: Optional[str] = None


class ColumnInDB(ColumnBase):
    """Schema for column in database"""
    id: int
    board_id: int
    position: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class Column(ColumnInDB):
    """Schema for column response"""
    cards: List["Card"] = []


# Card schemas
class CardBase(BaseModel):
    """Base card schema"""
    title: str
    description: Optional[str] = None
    priority: CardPriority = CardPriority.MEDIUM
    due_date: Optional[datetime] = None


class CardCreate(CardBase):
    """Schema for creating card"""
    column_id: int
    position: int = 0
    contact_id: Optional[int] = None
    assignee_ids: List[int] = []


class CardUpdate(BaseModel):
    """Schema for updating card"""
    title: Optional[str] = None
    description: Optional[str] = None
    column_id: Optional[int] = None
    position: Optional[int] = None
    priority: Optional[CardPriority] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None
    contact_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = None


class CardMove(BaseModel):
    """Schema for moving card"""
    column_id: int
    position: int


class CardDeleteConfirm(BaseModel):
    """Schema for confirming card deletion"""
    password: str


class CardInDB(CardBase):
    """Schema for card in database"""
    id: int
    column_id: int
    position: int
    completed: bool
    contact_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Card(CardInDB):
    """Schema for card response"""
    assignees: List[User] = []
    files: List[FileSchema] = []  # type: ignore
    comments: List[CommentSchema] = []  # type: ignore


# Comment schemas
class CommentBase(BaseModel):
    """Base comment schema"""
    content: str


class CommentCreate(CommentBase):
    """Schema for creating comment"""
    card_id: int


class CommentInDB(CommentBase):
    """Schema for comment in database"""
    id: int
    card_id: int
    author_id: int
    status: Optional[str] = None
    status_reason: Optional[str] = None
    status_by_id: Optional[int] = None
    status_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Comment(CommentInDB):
    """Schema for comment response"""
    author: User
    status_by: Optional[User] = None


# Checklist schemas
class ChecklistItemBase(BaseModel):
    """Base checklist item schema"""
    title: str
    completed: bool = False


class ChecklistItemCreate(ChecklistItemBase):
    """Schema for creating checklist item"""
    position: int = 0


class ChecklistItemUpdate(BaseModel):
    """Schema for updating checklist item"""
    title: Optional[str] = None
    completed: Optional[bool] = None
    position: Optional[int] = None


class ChecklistItemInDB(ChecklistItemBase):
    """Schema for checklist item in database"""
    id: int
    checklist_id: int
    position: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChecklistItem(ChecklistItemInDB):
    """Schema for checklist item response"""
    pass


class ChecklistBase(BaseModel):
    """Base checklist schema"""
    title: str


class ChecklistCreate(ChecklistBase):
    """Schema for creating checklist"""
    card_id: int
    position: int = 0


class ChecklistUpdate(BaseModel):
    """Schema for updating checklist"""
    title: Optional[str] = None
    position: Optional[int] = None


class ChecklistInDB(ChecklistBase):
    """Schema for checklist in database"""
    id: int
    card_id: int
    position: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class Checklist(ChecklistInDB):
    """Schema for checklist response"""
    items: List[ChecklistItem] = []


# Board with full details
class BoardDetail(Board):
    """Schema for board with columns and cards"""
    columns: List[Column] = []


# Rebuild models to resolve forward references after all imports are complete
from app.schemas.file import File
Card.model_rebuild()
Column.model_rebuild()
Comment.model_rebuild()
