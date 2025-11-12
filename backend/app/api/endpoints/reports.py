"""
Reports and statistics endpoints
"""
from typing import Dict, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.board import Board, Card, CardComment, card_assignees, Column
from app.models.contact import Contact
from app.models.file import File

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить общую статистику для дашборда
    """
    # Получаем статистику только если пользователь - администратор или менеджер
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {
            "error": "Недостаточно прав доступа"
        }
    
    # Общая статистика досок
    total_boards = db.query(Board).filter(Board.is_archived == False).count()
    
    # Статистика по карточкам
    total_cards = db.query(Card).count()
    cards_by_status = db.query(
        Card.completed,
        func.count(Card.id).label('count')
    ).group_by(Card.completed).all()
    
    # Преобразуем в удобный формат
    status_map = {True: 'completed', False: 'in_progress'}
    cards_by_status = {status_map.get(k, str(k)): v for k, v in cards_by_status}
    
    # Статистика по пользователям
    total_users = db.query(User).filter(User.is_active == True).count()
    total_contacts = db.query(Contact).count()
    
    # Статистика по активным задачам за последние 30 дней
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_cards = db.query(Card).filter(
        Card.created_at >= thirty_days_ago
    ).count()
    
    # Статистика по ролям пользователей
    users_by_role = db.query(
        User.role,
        func.count(User.id).label('count')
    ).filter(User.is_active == True).group_by(User.role).all()
    
    return {
        "overview": {
            "total_boards": total_boards,
            "total_cards": total_cards,
            "total_users": total_users,
            "total_contacts": total_contacts,
            "recent_cards": recent_cards
        },
        "cards_by_status": cards_by_status,
        "users_by_role": {role.value if hasattr(role, 'value') else str(role): count for role, count in users_by_role}
    }


@router.get("/tasks")
async def get_tasks_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить статистику по задачам
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    # Задачи по статусам
    tasks_by_status = db.query(
        Card.completed,
        func.count(Card.id).label('count')
    ).group_by(Card.completed).all()
    
    # Преобразуем в удобный формат
    status_map = {True: 'completed', False: 'in_progress'}
    tasks_by_status = {status_map.get(k, str(k)): v for k, v in tasks_by_status}
    
    # Задачи по приоритетам
    tasks_by_priority = db.query(
        Card.priority,
        func.count(Card.id).label('count')
    ).group_by(Card.priority).all()
    
    # Преобразуем enum в строки
    tasks_by_priority = {priority.value if hasattr(priority, 'value') else str(priority): count for priority, count in tasks_by_priority}
    
    # Задачи созданные за последние 7 дней (по дням)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    tasks_by_date = db.query(
        func.date(Card.created_at).label('date'),
        func.count(Card.id).label('count')
    ).filter(
        Card.created_at >= seven_days_ago
    ).group_by(func.date(Card.created_at)).order_by('date').all()
    
    return {
        "by_status": tasks_by_status,
        "by_priority": tasks_by_priority,
        "by_date": [{"date": str(date), "count": count} for date, count in tasks_by_date]
    }


@router.get("/users")
async def get_users_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить статистику по пользователям
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    # Пользователи по ролям
    users_by_role = db.query(
        User.role,
        func.count(User.id).label('count')
    ).filter(User.is_active == True).group_by(User.role).all()
    
    # Активные vs неактивные
    active_users = db.query(User).filter(
        User.is_active == True
    ).count()
    inactive_users = db.query(User).filter(
        User.is_active == False
    ).count()
    
    # Согласованные vs не согласованные
    approved_users = db.query(User).filter(
        User.is_approved == True
    ).count()
    pending_users = db.query(User).filter(
        User.is_approved == False
    ).count()
    
    return {
        "by_role": {role.value if hasattr(role, 'value') else str(role): count for role, count in users_by_role},
        "active": active_users,
        "inactive": inactive_users,
        "approved": approved_users,
        "pending": pending_users
    }


@router.get("/performance")
async def get_performance_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить статистику производительности за период
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Новые доски
    new_boards = db.query(Board).filter(
        Board.created_at >= start_date
    ).count()
    
    # Завершенные карточки
    completed_cards = db.query(Card).filter(
        and_(
            Card.completed == True,
            Card.created_at >= start_date
        )
    ).count()
    
    # Созданные карточки
    created_cards = db.query(Card).filter(
        Card.created_at >= start_date
    ).count()
    
    # Новые контакты
    new_contacts = db.query(Contact).filter(
        Contact.created_at >= start_date
    ).count()
    
    # Коэффициент завершения
    completion_rate = (completed_cards / created_cards * 100) if created_cards > 0 else 0
    
    return {
        "period_days": days,
        "new_boards": new_boards,
        "completed_cards": completed_cards,
        "created_cards": created_cards,
        "new_contacts": new_contacts,
        "completion_rate": round(completion_rate, 2)
    }


@router.get("/manager-efficiency")
async def get_manager_efficiency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Рейтинг эффективности менеджеров по закрытым задачам и срокам исполнения
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    # Получаем всех менеджеров
    managers = db.query(User).filter(User.role == UserRole.MANAGER).all()
    
    efficiency_data = []
    for manager in managers:
        # Количество досок у менеджера
        owned_boards = db.query(Board).filter(Board.owner_id == manager.id).count()
        
        # Получаем все карточки с досок менеджера
        manager_cards = db.query(Card).join(Board.columns).filter(
            Board.owner_id == manager.id
        ).all()
        
        total_cards = len(manager_cards)
        completed_cards = sum(1 for card in manager_cards if card.completed)
        
        # Считаем просроченные задачи
        overdue_cards = sum(1 for card in manager_cards if card.due_date and card.completed_at and card.due_date < card.completed_at)
        
        # Средняя задержка в днях
        delays = []
        for card in manager_cards:
            if card.due_date and card.completed_at:
                delay = (card.completed_at - card.due_date).days
                if delay > 0:
                    delays.append(delay)
        
        avg_delay = sum(delays) / len(delays) if delays else 0
        completion_rate = (completed_cards / total_cards * 100) if total_cards > 0 else 0
        
        efficiency_data.append({
            "manager_name": manager.full_name,
            "manager_id": manager.id,
            "owned_boards": owned_boards,
            "total_tasks": total_cards,
            "completed_tasks": completed_cards,
            "completion_rate": round(completion_rate, 2),
            "overdue_tasks": overdue_cards,
            "avg_delay_days": round(avg_delay, 1),
            "efficiency_score": round(completion_rate - (avg_delay * 2), 1)  # Простой рейтинг
        })
    
    # Сортируем по рейтингу эффективности
    efficiency_data.sort(key=lambda x: x["efficiency_score"], reverse=True)
    
    return efficiency_data


@router.get("/employee-contribution")
async def get_employee_contribution(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Анализ вклада сотрудников в общий результат
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Получаем всех исполнителей
    executors = db.query(User).filter(User.role == UserRole.EXECUTOR).all()
    
    contribution_data = []
    for executor in executors:
        # Получаем назначенные задачи исполнителя
        assigned_cards = db.query(Card).join(card_assignees).filter(
            card_assignees.c.user_id == executor.id,
            Card.created_at >= start_date
        ).all()
        
        total_assigned = len(assigned_cards)
        completed = sum(1 for card in assigned_cards if card.completed)
        in_progress = total_assigned - completed
        
        # Подсчитываем комментарии (активность)
        comments = db.query(func.count(CardComment.id)).filter(
            CardComment.author_id == executor.id,
            CardComment.created_at >= start_date
        ).scalar() or 0
        
        # Подсчитываем файлы (прикрепленные материалы)
        uploaded_files = db.query(func.count(File.id)).filter(
            File.uploaded_by_id == executor.id,
            File.created_at >= start_date
        ).scalar() or 0
        
        contribution_score = completed * 10 + in_progress * 5 + comments * 2 + uploaded_files * 3
        
        contribution_data.append({
            "employee_name": executor.full_name,
            "employee_id": executor.id,
            "assigned_tasks": total_assigned,
            "completed_tasks": completed,
            "in_progress_tasks": in_progress,
            "comments_count": comments,
            "files_count": uploaded_files,
            "contribution_score": contribution_score
        })
    
    contribution_data.sort(key=lambda x: x["contribution_score"], reverse=True)
    
    return contribution_data


@router.get("/gantt-chart")
async def get_gantt_data(
    board_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Данные для диаграммы Ганта - визуализация сроков, зависимостей и прогресса
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    # Получаем все доски или конкретную доску
    query = db.query(Board)
    if board_id:
        query = query.filter(Board.id == board_id)
    boards = query.all()
    
    gantt_data = []
    for board in boards:
        board_cards = db.query(Card).join(Board.columns).filter(
            Board.id == board.id
        ).all()
        
        for card in board_cards:
            # Определяем прогресс на основе колонки (статуса)
            # Запланировано = 0%, В работе = 33%, На проверке = 66%, Готово = 100%
            progress = 0
            if card.column:
                status = card.column.title.lower()
                if "готово" in status or "done" in status:
                    progress = 100
                elif "проверке" in status or "review" in status:
                    progress = 66
                elif "работе" in status or "progress" in status:
                    progress = 33
            
            # Формируем данные для Gantt
            gantt_item = {
                "task_id": card.id,
                "task_name": card.title,
                "board_id": board.id,
                "board_name": board.title,
                "start_date": card.created_at.isoformat() if card.created_at else None,
                "end_date": card.due_date.isoformat() if card.due_date else None,
                "progress": progress,
                "priority": card.priority.value if hasattr(card.priority, 'value') else str(card.priority),
                "assignees": [user.full_name for user in card.assignees] if card.assignees else [],
                "completed": card.completed,
                "overdue": card.due_date and card.due_date < datetime.utcnow() and not card.completed
            }
            
            gantt_data.append(gantt_item)
    
    return gantt_data


@router.get("/flexible-summary")
async def get_flexible_summary(
    board_ids: str = None,  # comma-separated board IDs
    priority: str = None,
    assignee_id: int = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Гибкая сводка - настраиваемые колонки с задачами по заданным фильтрам
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        return {"error": "Недостаточно прав доступа"}
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Базовый запрос
    query = db.query(Card).join(Board.columns)
    
    # Применяем фильтры
    if board_ids:
        board_id_list = [int(id.strip()) for id in board_ids.split(',')]
        query = query.join(Board).filter(Board.id.in_(board_id_list))
    
    if priority:
        query = query.filter(Card.priority == priority)
    
    if assignee_id:
        query = query.join(card_assignees).filter(card_assignees.c.user_id == assignee_id)
    
    query = query.filter(Card.created_at >= start_date)
    
    cards = query.all()
    
    # Группируем по различным параметрам
    summary = {
        "total_tasks": len(cards),
        "by_status": {},
        "by_priority": {},
        "by_board": {},
        "by_assignee": {},
        "tasks": []
    }
    
    for card in cards:
        # По статусу
        status = card.column.title if card.column else "Unknown"
        summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
        
        # По приоритету
        priority_val = card.priority.value if hasattr(card.priority, 'value') else str(card.priority)
        summary["by_priority"][priority_val] = summary["by_priority"].get(priority_val, 0) + 1
        
        # По доске
        board_title = card.column.board.title if card.column and card.column.board else "Unknown"
        summary["by_board"][board_title] = summary["by_board"].get(board_title, 0) + 1
        
        # По исполнителю
        if card.assignees:
            for assignee in card.assignees:
                summary["by_assignee"][assignee.full_name] = summary["by_assignee"].get(assignee.full_name, 0) + 1
        else:
            summary["by_assignee"]["Не назначено"] = summary["by_assignee"].get("Не назначено", 0) + 1
        
        # Детальная информация о задаче
        summary["tasks"].append({
            "id": card.id,
            "title": card.title,
            "board": board_title,
            "status": status,
            "priority": priority_val,
            "assignees": [a.full_name for a in card.assignees],
            "due_date": card.due_date.isoformat() if card.due_date else None,
            "completed": card.completed
        })
    
    return summary

