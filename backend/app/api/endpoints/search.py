"""
Global search endpoint
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.board import Board, Card, CardComment
from app.models.contact import Contact

router = APIRouter()


@router.get("/", response_model=Dict[str, List[Any]])
async def global_search(
    q: str = Query(..., min_length=2, description="Поисковый запрос"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Глобальный поиск по всей системе
    """
    search_pattern = f"%{q}%"
    
    # Search boards
    boards = db.query(Board).filter(
        (Board.title.ilike(search_pattern)) |
        (Board.description.ilike(search_pattern))
    ).limit(10).all()
    
    # Search cards
    cards = db.query(Card).filter(
        (Card.title.ilike(search_pattern)) |
        (Card.description.ilike(search_pattern))
    ).limit(10).all()
    
    # Search contacts
    contacts = db.query(Contact).filter(
        (Contact.company_name.ilike(search_pattern)) |
        (Contact.contact_person.ilike(search_pattern)) |
        (Contact.email.ilike(search_pattern))
    ).limit(10).all()
    
    # Search comments
    comments = db.query(CardComment).filter(
        CardComment.content.ilike(search_pattern)
    ).limit(10).all()
    
    return {
        "boards": [
            {
                "id": board.id,
                "title": board.title,
                "description": board.description,
                "type": "board"
            }
            for board in boards
        ],
        "cards": [
            {
                "id": card.id,
                "title": card.title,
                "description": card.description,
                "type": "card"
            }
            for card in cards
        ],
        "contacts": [
            {
                "id": contact.id,
                "company_name": contact.company_name,
                "contact_person": contact.contact_person,
                "type": "contact"
            }
            for contact in contacts
        ],
        "comments": [
            {
                "id": comment.id,
                "content": comment.content,
                "card_id": comment.card_id,
                "type": "comment"
            }
            for comment in comments
        ]
    }

