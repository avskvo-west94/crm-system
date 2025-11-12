"""
Background tasks for cleanup and notifications
"""
import os
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import SessionLocal
from app.models.file import File
from app.models.board import Card
from app.models.notification import Notification, NotificationType
from app.core.config import settings


async def cleanup_expired_files():
    """
    Удалить файлы, у которых истек срок хранения
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Найти файлы с истекшим сроком
        expired_files = db.query(File).filter(
            File.expires_at.isnot(None),
            File.expires_at <= now
        ).all()
        
        deleted_count = 0
        for file in expired_files:
            # Удалить физический файл
            if os.path.exists(file.file_path):
                try:
                    os.remove(file.file_path)
                    deleted_count += 1
                except Exception as e:
                    print(f"Ошибка при удалении файла {file.file_path}: {e}")
            
            # Удалить запись из БД
            db.delete(file)
        
        db.commit()
        
        if deleted_count > 0:
            print(f"✅ Удалено {deleted_count} устаревших файлов")
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка при очистке файлов: {e}")
    finally:
        db.close()


async def check_card_deadlines():
    """
    Проверить дедлайны карточек и отправить уведомления
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Найти карточки с дедлайном через 1 день
        from datetime import timedelta
        due_soon_date = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        
        cards_due_soon = db.query(Card).filter(
            Card.due_date.isnot(None),
            Card.completed == False,
            Card.due_date <= due_soon_date,
            Card.due_date > now
        ).all()
        
        # Найти просроченные карточки
        cards_overdue = db.query(Card).filter(
            Card.due_date.isnot(None),
            Card.completed == False,
            Card.due_date < now
        ).all()
        
        notifications_created = 0
        
        # Уведомления о скором дедлайне
        for card in cards_due_soon:
            # Создать уведомление для исполнителей
            for assignee in card.assignees:
                notification = Notification(
                    user_id=assignee.id,
                    type=NotificationType.CARD_DUE_SOON,
                    title=f"Дедлайн скоро: {card.title}",
                    message=f"У задачи '{card.title}' дедлайн наступает завтра",
                    card_id=card.id,
                    link=f"/boards/{card.column.board_id}#card-{card.id}"
                )
                db.add(notification)
                notifications_created += 1
            
            # Создать уведомление для владельца доски (менеджера)
            if card.column and card.column.board:
                manager_id = card.column.board.owner_id
                notification = Notification(
                    user_id=manager_id,
                    type=NotificationType.CARD_DUE_SOON,
                    title=f"Дедлайн близко: {card.title}",
                    message=f"У задачи '{card.title}' дедлайн наступает завтра",
                    card_id=card.id,
                    link=f"/boards/{card.column.board_id}#card-{card.id}"
                )
                db.add(notification)
                notifications_created += 1
        
        # Уведомления о просроченных задачах
        for card in cards_overdue:
            # Создать уведомление для исполнителей
            for assignee in card.assignees:
                notification = Notification(
                    user_id=assignee.id,
                    type=NotificationType.CARD_OVERDUE,
                    title=f"Просрочено: {card.title}",
                    message=f"Задача '{card.title}' просрочена!",
                    card_id=card.id,
                    link=f"/boards/{card.column.board_id}#card-{card.id}"
                )
                db.add(notification)
                notifications_created += 1
            
            # Создать уведомление для владельца доски (менеджера)
            if card.column and card.column.board:
                manager_id = card.column.board.owner_id
                notification = Notification(
                    user_id=manager_id,
                    type=NotificationType.CARD_OVERDUE,
                    title=f"Просрочено: {card.title}",
                    message=f"Задача '{card.title}' просрочена!",
                    card_id=card.id,
                    link=f"/boards/{card.column.board_id}#card-{card.id}"
                )
                db.add(notification)
                notifications_created += 1
        
        db.commit()
        
        if notifications_created > 0:
            print(f"✅ Создано {notifications_created} уведомлений о дедлайнах")
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка при проверке дедлайнов: {e}")
    finally:
        db.close()


async def run_background_tasks():
    """
    Запустить фоновые задачи
    """
    while True:
        try:
            await cleanup_expired_files()
            await check_card_deadlines()
        except Exception as e:
            print(f"Ошибка в фоновых задачах: {e}")
        
        # Выполнять проверки каждый час
        await asyncio.sleep(3600)  # 1 час


def start_background_tasks():
    """
    Запустить фоновые задачи в отдельном потоке
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_background_tasks())

