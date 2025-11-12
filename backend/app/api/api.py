"""
API router combining all endpoints
"""
from fastapi import APIRouter

from app.api.endpoints import auth, users, boards, cards, contacts, notifications, calendar_events, files, search, chat, reports

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Аутентификация"])
api_router.include_router(users.router, prefix="/users", tags=["Пользователи"])
api_router.include_router(boards.router, prefix="/boards", tags=["Доски"])
api_router.include_router(cards.router, prefix="/cards", tags=["Карточки"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Контакты"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Уведомления"])
api_router.include_router(calendar_events.router, prefix="/calendar", tags=["Календарь"])
api_router.include_router(files.router, prefix="/files", tags=["Файлы"])
api_router.include_router(search.router, prefix="/search", tags=["Поиск"])
api_router.include_router(chat.router, prefix="/chat", tags=["Чат"])
api_router.include_router(reports.router, prefix="/reports", tags=["Отчеты"])

