"""
Board management endpoints
"""
import os
import zipfile
import tempfile
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from weasyprint import HTML
from jinja2 import Template

from app.core.database import get_db
from app.core.security import get_current_user, check_manager_or_admin
from app.core.config import settings
from app.models.user import User
from app.models.board import Board, Column, Card, CardComment, CardChecklist, CardChecklistItem, BoardStatus
from app.models.file import File
from app.models.contact import Contact
from app.models.calendar_event import CalendarEvent
from app.schemas.board import (
    Board as BoardSchema,
    BoardCreate,
    BoardUpdate,
    BoardDetail,
    Column as ColumnSchema,
    ColumnCreate,
    ColumnUpdate
)

router = APIRouter()


# Board endpoints
@router.get("/", response_model=List[BoardSchema])
async def get_boards(
    skip: int = 0,
    limit: int = 100,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список досок
    """
    query = db.query(Board)
    
    if not include_archived:
        query = query.filter(Board.is_archived == False)
    
    boards = query.offset(skip).limit(limit).all()
    return boards


@router.post("/", response_model=BoardSchema, status_code=status.HTTP_201_CREATED)
async def create_board(
    board_in: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Создать новую доску
    """
    board = Board(
        **board_in.dict(),
        owner_id=current_user.id
    )
    
    db.add(board)
    db.commit()
    db.refresh(board)
    
    # Create default columns
    default_columns = [
        {"title": "Запланировано", "position": 0, "color": "#9CA3AF"},
        {"title": "В работе", "position": 1, "color": "#3B82F6"},
        {"title": "На проверке", "position": 2, "color": "#F59E0B"},
        {"title": "Готово", "position": 3, "color": "#10B981"},
    ]
    
    for col_data in default_columns:
        column = Column(board_id=board.id, **col_data)
        db.add(column)
    
    db.commit()
    db.refresh(board)
    
    return board


@router.get("/{board_id}", response_model=BoardDetail)
async def get_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить доску по ID с колонками
    """
    board = db.query(Board).options(
        joinedload(Board.owner),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.assignees),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.files),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.comments).joinedload(CardComment.author)
    ).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доска не найдена"
        )
    return board


@router.put("/{board_id}", response_model=BoardSchema)
async def update_board(
    board_id: int,
    board_in: BoardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Обновить доску
    """
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доска не найдена"
        )
    
    # Update board fields
    update_data = board_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(board, field, value)
    
    db.commit()
    db.refresh(board)
    
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Удалить доску
    """
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доска не найдена"
        )
    
    db.delete(board)
    db.commit()
    
    return None


# Column endpoints
@router.get("/{board_id}/columns", response_model=List[ColumnSchema])
async def get_columns(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить колонки доски
    """
    columns = db.query(Column).filter(Column.board_id == board_id).order_by(Column.position).all()
    return columns


@router.post("/columns", response_model=ColumnSchema, status_code=status.HTTP_201_CREATED)
async def create_column(
    column_in: ColumnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Создать новую колонку
    """
    # Check if board exists
    board = db.query(Board).filter(Board.id == column_in.board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доска не найдена"
        )
    
    column = Column(**column_in.dict())
    
    db.add(column)
    db.commit()
    db.refresh(column)
    
    return column


@router.put("/columns/{column_id}", response_model=ColumnSchema)
async def update_column(
    column_id: int,
    column_in: ColumnUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Обновить колонку
    """
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Колонка не найдена"
        )
    
    # Update column fields
    update_data = column_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(column, field, value)
    
    db.commit()
    db.refresh(column)
    
    return column


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(
    column_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Удалить колонку
    """
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Колонка не найдена"
        )
    
    db.delete(column)
    db.commit()
    
    return None


@router.get("/{board_id}/archive")
async def archive_board_files(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_manager_or_admin)
):
    """
    Скачать архив всех файлов проекта (доски)
    """
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доска не найдена"
        )
    
    # Получаем все карточки доски
    cards = db.query(Card).join(Column).filter(Column.board_id == board_id).all()
    card_ids = [card.id for card in cards]
    
    # Получаем все файлы этих карточек
    files = db.query(File).filter(File.card_id.in_(card_ids)).all()
    
    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Нет файлов для архивации"
        )
    
    # Создаем временный архив
    temp_dir = tempfile.gettempdir()
    # Используем ID доски вместо названия для избежания проблем с кодировкой
    archive_filename = f"board_{board_id}_files_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    archive_path = os.path.join(temp_dir, archive_filename)
    
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_record in files:
            if os.path.exists(file_record.file_path):
                # Добавляем файл в архив с оригинальным именем
                zipf.write(file_record.file_path, arcname=file_record.original_filename)
    
    # Возвращаем архив для скачивания
    return FileResponse(
        archive_path,
        media_type="application/zip",
        filename=archive_filename,
        headers={"Content-Disposition": f"attachment; filename={archive_filename}"}
    )


@router.get("/{board_id}/export-pdf")
async def export_board_pdf(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Экспортировать архив проекта в PDF.
    Доступно только для проектов со статусом: Завершен, Отменен, Неудачный
    """
    # Проверка доступа только для менеджеров и админов
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    # Получаем доску (проект) со всеми связанными данными
    board = db.query(Board).options(
        joinedload(Board.owner),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.assignees),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.comments).joinedload(CardComment.author),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.comments).joinedload(CardComment.status_by),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.checklists).joinedload(CardChecklist.items),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.files),
        joinedload(Board.columns).joinedload(Column.cards).joinedload(Card.contact)
    ).filter(Board.id == board_id).first()
    
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден"
        )
    
    # Проверяем, что проект в финальном статусе
    # board.status может быть enum, поэтому используем .name для получения строки
    if isinstance(board.status, BoardStatus):
        board_status = board.status.name
    else:
        board_status = str(board.status).upper()
    
    if board_status not in ['COMPLETED', 'CANCELLED', 'FAILED']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Экспорт доступен только для завершенных, отмененных или неудачных проектов. Текущий статус: {board.status}"
        )
    
    # Получаем контакты, связанные с задачами проекта
    card_ids = []
    for column in board.columns:
        for card in column.cards:
            card_ids.append(card.id)
    
    contacts = db.query(Contact).join(Card).filter(Card.id.in_(card_ids)).distinct().all()
    
    # Получаем события календаря, связанные с задачами проекта
    events = db.query(CalendarEvent).options(
        joinedload(CalendarEvent.created_by),
        joinedload(CalendarEvent.shared_with_users)
    ).filter(CalendarEvent.card_id.in_(card_ids)).order_by(CalendarEvent.start_date).all()
    
    # Подсчитываем метрики проекта
    total_tasks = sum(len(column.cards) for column in board.columns)
    completed_tasks = sum(1 for column in board.columns for card in column.cards if card.completed)
    overdue_tasks = sum(1 for column in board.columns for card in column.cards if card.due_date and card.due_date < datetime.utcnow() and not card.completed)
    completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Подсчитываем задачи по статусам
    tasks_by_status = {}
    for column in board.columns:
        status_name = column.title
        tasks_by_status[status_name] = len(column.cards)
    
    # Формируем хронологию событий
    activity_log = []
    
    # События из календаря
    for event in events:
        activity_log.append({
            'type': 'calendar_event',
            'date': event.start_date,
            'title': f"Событие: {event.title}",
            'description': event.description,
            'created_by': event.created_by.full_name if event.created_by else 'Неизвестно',
            'participants': ', '.join([u.full_name for u in event.shared_with_users]) if event.shared_with_users else None
        })
    
    # Комментарии к задачам
    for column in board.columns:
        for card in column.cards:
            for comment in card.comments:
                activity_log.append({
                    'type': 'comment',
                    'date': comment.created_at,
                    'title': f"Комментарий к задаче: {card.title}",
                    'description': comment.content,
                    'author': comment.author.full_name if comment.author else 'Неизвестно',
                    'status': comment.status,
                    'status_by': comment.status_by.full_name if comment.status_by else None,
                    'status_reason': comment.status_reason
                })
    
    # Файлы
    for column in board.columns:
        for card in column.cards:
            for file_record in card.files:
                activity_log.append({
                    'type': 'file',
                    'date': file_record.created_at,
                    'title': f"Загружен файл к задаче: {card.title}",
                    'description': f"Файл: {file_record.original_filename}",
                    'uploaded_by': file_record.uploaded_by.full_name if file_record.uploaded_by else 'Неизвестно'
                })
    
    # Сортируем хронологию по дате
    activity_log.sort(key=lambda x: x['date'] if x['date'] else datetime.min)
    
    # Формируем манифест файлов
    file_manifest = []
    for column in board.columns:
        for card in column.cards:
            for file_record in card.files:
                file_manifest.append({
                    'filename': file_record.original_filename,
                    'size': file_record.file_size,
                    'uploaded_by': file_record.uploaded_by.full_name if file_record.uploaded_by else 'Неизвестно',
                    'uploaded_at': file_record.created_at,
                    'attached_to': card.title,
                    'retention_days': file_record.retention_days,
                    'expires_at': file_record.expires_at
                })
    
    # Перевод статуса проекта на русский
    status_translations = {
        'PLANNING': "Планирование",
        'IN_PROGRESS': "В работе",
        'ON_HOLD': "Приостановлен",
        'COMPLETED': "Завершен",
        'CANCELLED': "Отменен",
        'FAILED': "Неудачный"
    }
    
    # Нормализуем статус для использования в шаблоне
    if isinstance(board.status, BoardStatus):
        board_status_normalized = board.status.name
    else:
        board_status_normalized = str(board.status).upper()
    
    # Формируем данные для шаблона
    project_data = {
        'title': board.title,
        'id': board.id,
        'status': status_translations.get(board_status_normalized, str(board.status)),
        'manager': board.owner.full_name if board.owner else 'Неизвестно',
        'description': board.description,
        'created_at': board.created_at,
        'updated_at': board.updated_at,
        'summary_metrics': {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'overdue_tasks': overdue_tasks,
            'completion_percentage': completion_percentage
        },
        'tasks_by_status': tasks_by_status,
        'columns': [],
        'contacts': [
            {
                'company_name': contact.company_name,
                'contact_person': contact.contact_person,
                'type': contact.type,
                'email': contact.email,
                'phone': contact.phone,
                'address': contact.address
            }
            for contact in contacts
        ],
        'activity_log': activity_log,
        'file_manifest': file_manifest,
        'generated_at': datetime.utcnow()
    }
    
    # Добавляем данные по колонкам и задачам
    for column in board.columns:
        column_data = {
            'title': column.title,
            'tasks': []
        }
        
        for card in column.cards:
            task_data = {
                'title': card.title or '',
                'description': card.description or '',
                'assignees': ', '.join([assignee.full_name for assignee in card.assignees]) if card.assignees else 'Не назначено',
                'planned_start': card.created_at,
                'planned_end': card.due_date if card.due_date else None,
                'actual_completion': card.completed_at if card.completed else None,
                'status': 'Выполнена' if card.completed else 'В работе',
                'is_overdue': card.due_date and card.due_date < datetime.utcnow() and not card.completed,
                'priority': str(card.priority) if card.priority else 'medium',
                'comments': [],
                'checklists': [],
                'contact': card.contact.company_name if card.contact else None
            }
            
            # Комментарии
            for comment in card.comments:
                task_data['comments'].append({
                    'author': comment.author.full_name if comment.author else 'Неизвестно',
                    'date': comment.created_at,
                    'content': comment.content,
                    'status': comment.status,
                    'status_by': comment.status_by.full_name if comment.status_by else None,
                    'status_reason': comment.status_reason
                })
            
            # Чек-листы
            for checklist in card.checklists:
                checklist_data = {
                    'title': checklist.title,
                    'items': []
                }
                for item in checklist.items:
                    checklist_data['items'].append({
                        'title': item.title,
                        'completed': item.completed,
                        'completed_at': item.completed_at
                    })
                task_data['checklists'].append(checklist_data)
            
            column_data['tasks'].append(task_data)
        
        project_data['columns'].append(column_data)
    
    # HTML шаблон для PDF
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4;
                margin: 2cm;
                @top-center {
                    content: "{{ title }}";
                    font-family: Arial, sans-serif;
                    font-size: 10pt;
                    color: #333;
                }
                @bottom-right {
                    content: "Страница " counter(page) " из " counter(pages);
                    font-family: Arial, sans-serif;
                    font-size: 10pt;
                    color: #666;
                }
                @bottom-left {
                    content: "Дата генерации: {{ generated_at.strftime('%d.%m.%Y %H:%M') }}";
                    font-family: Arial, sans-serif;
                    font-size: 10pt;
                    color: #666;
                }
            }
            body {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 11pt;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .title-page {
                text-align: center;
                margin-top: 5cm;
                page-break-after: always;
            }
            .title-page h1 {
                font-size: 28pt;
                margin-bottom: 0.5cm;
                color: #1a1a1a;
            }
            .title-page .subtitle {
                font-size: 14pt;
                color: #666;
                margin-top: 1cm;
            }
            .info-table {
                margin-top: 2cm;
                text-align: left;
            }
            .info-table table {
                width: 100%;
                border-collapse: collapse;
            }
            .info-table td {
                padding: 8pt;
                border-bottom: 1px solid #ddd;
            }
            .info-table td:first-child {
                font-weight: bold;
                width: 30%;
            }
            h2 {
                font-size: 16pt;
                margin-top: 1.5cm;
                margin-bottom: 0.5cm;
                color: #1a1a1a;
                border-bottom: 2px solid #333;
                padding-bottom: 0.2cm;
                page-break-after: avoid;
            }
            h3 {
                font-size: 14pt;
                margin-top: 1cm;
                margin-bottom: 0.3cm;
                color: #333;
                page-break-after: avoid;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 1cm;
            }
            th {
                background-color: #f0f0f0;
                font-weight: bold;
                padding: 8pt;
                text-align: left;
                border: 1px solid #ccc;
            }
            td {
                padding: 6pt;
                border: 1px solid #ccc;
                vertical-align: top;
            }
            .metric-box {
                display: inline-block;
                width: 22%;
                margin: 1%;
                padding: 15pt;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                text-align: center;
            }
            .metric-value {
                font-size: 24pt;
                font-weight: bold;
                color: #1a1a1a;
            }
            .metric-label {
                font-size: 10pt;
                color: #666;
                margin-top: 5pt;
            }
            .task-item {
                margin-bottom: 1cm;
                padding: 10pt;
                border: 1px solid #ddd;
                background-color: #fafafa;
            }
            .task-title {
                font-weight: bold;
                font-size: 12pt;
                margin-bottom: 5pt;
            }
            .task-meta {
                font-size: 9pt;
                color: #666;
                margin-bottom: 5pt;
            }
            .comment {
                margin-left: 20pt;
                padding: 8pt;
                background-color: #f5f5f5;
                border-left: 3px solid #666;
                margin-bottom: 8pt;
            }
            .comment-header {
                font-size: 9pt;
                color: #666;
                margin-bottom: 5pt;
            }
            .comment-content {
                font-size: 10pt;
            }
            .checklist {
                margin-left: 20pt;
                margin-bottom: 10pt;
            }
            .checklist-item {
                font-size: 10pt;
                margin-bottom: 3pt;
            }
            .checklist-item.completed {
                text-decoration: line-through;
                color: #666;
            }
            .status-badge {
                display: inline-block;
                padding: 3pt 8pt;
                border-radius: 3pt;
                font-size: 9pt;
                font-weight: bold;
            }
            .status-completed {
                background-color: #28a745;
                color: white;
            }
            .status-overdue {
                background-color: #dc3545;
                color: white;
            }
            .status-in-progress {
                background-color: #ffc107;
                color: #333;
            }
            .status-accepted {
                background-color: #28a745;
                color: white;
            }
            .status-rejected {
                background-color: #dc3545;
                color: white;
            }
            .status-pending {
                background-color: #6c757d;
                color: white;
            }
            .activity-item {
                margin-bottom: 15pt;
                padding: 10pt;
                border-left: 4px solid #666;
                background-color: #f9f9f9;
            }
            .activity-date {
                font-weight: bold;
                font-size: 10pt;
                color: #666;
            }
            .activity-title {
                font-weight: bold;
                font-size: 11pt;
                margin-top: 5pt;
            }
            .activity-description {
                font-size: 10pt;
                margin-top: 5pt;
            }
            .page-break {
                page-break-before: always;
            }
        </style>
    </head>
    <body>
        <!-- Титульный лист -->
        <div class="title-page">
            <h1>АРХИВ ПРОЕКТА</h1>
            <div class="subtitle">{{ title }}</div>
            <div class="info-table">
                <table>
                    <tr>
                        <td>ID проекта:</td>
                        <td>#{{ id }}</td>
                    </tr>
                    <tr>
                        <td>Статус:</td>
                        <td>{{ status }}</td>
                    </tr>
                    <tr>
                        <td>Менеджер проекта:</td>
                        <td>{{ manager }}</td>
                    </tr>
                    <tr>
                        <td>Дата начала:</td>
                        <td>{{ created_at.strftime('%d.%m.%Y') }}</td>
                    </tr>
                    <tr>
                        <td>Дата закрытия:</td>
                        <td>{{ updated_at.strftime('%d.%m.%Y') if updated_at else 'Не указана' }}</td>
                    </tr>
                </table>
            </div>
            {% if description %}
            <div style="margin-top: 1cm; text-align: left;">
                <h3>Описание проекта:</h3>
                <p>{{ description }}</p>
            </div>
            {% endif %}
        </div>
        
        <!-- Раздел 1: Сводка по проекту -->
        <h2>1. СВОДКА ПО ПРОЕКТУ</h2>
        
        <div style="text-align: center;">
            <div class="metric-box">
                <div class="metric-value">{{ summary_metrics.total_tasks }}</div>
                <div class="metric-label">Всего задач</div>
            </div>
            <div class="metric-box">
                <div class="metric-value">{{ summary_metrics.completed_tasks }}</div>
                <div class="metric-label">Выполнено</div>
            </div>
            <div class="metric-box">
                <div class="metric-value">{{ summary_metrics.overdue_tasks }}</div>
                <div class="metric-label">Просрочено</div>
            </div>
            <div class="metric-box">
                <div class="metric-value">{{ "%.1f"|format(summary_metrics.completion_percentage) }}%</div>
                <div class="metric-label">Выполнение</div>
            </div>
        </div>
        
        <h3>Распределение задач по статусам</h3>
        <table>
            <thead>
                <tr>
                    <th>Статус</th>
                    <th>Количество задач</th>
                </tr>
            </thead>
            <tbody>
                {% for status, count in tasks_by_status.items() %}
                <tr>
                    <td>{{ status }}</td>
                    <td>{{ count }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        
        <div class="page-break"></div>
        
        <!-- Раздел 2: Детализация по задачам -->
        <h2>2. ДЕТАЛИЗАЦИЯ ПО ЗАДАЧАМ</h2>
        
        {% for column in columns %}
        <h3>{{ column.title }}</h3>
        
        {% for task in column.tasks %}
        <div class="task-item">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
                <strong>Исполнитель(и):</strong> {{ task.assignees if task.assignees else 'Не назначен' }}<br>
                <strong>Сроки:</strong> 
                {% if task.planned_start %}
                    Начало: {{ task.planned_start.strftime('%d.%m.%Y') }}
                {% endif %}
                {% if task.planned_end %}
                    - Окончание: {{ task.planned_end.strftime('%d.%m.%Y') }}
                {% endif %}
                {% if task.actual_completion %}
                    (Факт завершения: {{ task.actual_completion.strftime('%d.%m.%Y') }})
                {% endif %}
                <br>
                <strong>Статус:</strong> 
                {% if task.is_overdue %}
                    <span class="status-badge status-overdue">Просрочена</span>
                {% elif task.status == 'Выполнена' %}
                    <span class="status-badge status-completed">Выполнена</span>
                {% else %}
                    <span class="status-badge status-in-progress">В работе</span>
                {% endif %}
                <br>
                {% if task.contact %}
                <strong>Контрагент:</strong> {{ task.contact }}<br>
                {% endif %}
                {% if task.description %}
                <strong>Описание:</strong> {{ task.description }}<br>
                {% endif %}
            </div>
            
            {% if task.comments %}
            <div style="margin-top: 8pt;">
                <strong>Комментарии:</strong>
                {% for comment in task.comments %}
                <div class="comment">
                    <div class="comment-header">
                        {{ comment.author }}, {{ comment.date.strftime('%d.%m.%Y %H:%M') }}
                        {% if comment.status %}
                        <span class="status-badge {% if comment.status == 'accepted' %}status-accepted{% elif comment.status == 'rejected' %}status-rejected{% else %}status-pending{% endif %}">
                            {% if comment.status == 'accepted' %}Принят{% elif comment.status == 'rejected' %}Отклонен{% else %}Ожидает{% endif %}
                        </span>
                        {% if comment.status_by %}
                        ({{ comment.status_by }})
                        {% endif %}
                        {% if comment.status_reason %}
                        — {{ comment.status_reason }}
                        {% endif %}
                        {% endif %}
                    </div>
                    <div class="comment-content">{{ comment.content }}</div>
                </div>
                {% endfor %}
            </div>
            {% endif %}
            
            {% if task.checklists %}
            <div style="margin-top: 8pt;">
                <strong>Чек-листы:</strong>
                {% for checklist in task.checklists %}
                <div class="checklist">
                    <strong>{{ checklist.title }}:</strong>
                    {% for item in checklist.items %}
                    <div class="checklist-item {% if item.completed %}completed{% endif %}">
                        {% if item.completed %}✓{% else %}☐{% endif %} {{ item.title }}
                        {% if item.completed_at %}
                        (выполнено {{ item.completed_at.strftime('%d.%m.%Y') }})
                        {% endif %}
                    </div>
                    {% endfor %}
                </div>
                {% endfor %}
            </div>
            {% endif %}
        </div>
        {% endfor %}
        {% endfor %}
        
        <div class="page-break"></div>
        
        <!-- Раздел 3: Взаимодействия и коммуникации -->
        <h2>3. ВЗАИМОДЕЙСТВИЯ И КОММУНИКАЦИИ</h2>
        
        {% if activity_log %}
        <h3>Хронология событий</h3>
        {% for activity in activity_log %}
        <div class="activity-item">
            <div class="activity-date">{{ activity.date.strftime('%d.%m.%Y %H:%M') if activity.date else 'Дата неизвестна' }}</div>
            <div class="activity-title">{{ activity.title }}</div>
            {% if activity.description %}
            <div class="activity-description">{{ activity.description }}</div>
            {% endif %}
            {% if activity.created_by or activity.author or activity.uploaded_by %}
            <div class="activity-description" style="margin-top: 5pt; font-style: italic; color: #666;">
                {% if activity.type == 'calendar_event' %}
                    Создал: {{ activity.created_by }}
                    {% if activity.participants %}
                    | Участники: {{ activity.participants }}
                    {% endif %}
                {% elif activity.type == 'comment' %}
                    Автор: {{ activity.author }}
                {% elif activity.type == 'file' %}
                    Загрузил: {{ activity.uploaded_by }}
                {% endif %}
            </div>
            {% endif %}
        </div>
        {% endfor %}
        {% else %}
        <p style="color: #666; font-style: italic;">Нет записей о взаимодействиях</p>
        {% endif %}
        
        <div class="page-break"></div>
        
        <!-- Раздел 4: Контакты -->
        <h2>4. КОНТАКТЫ</h2>
        
        {% if contacts %}
        <table>
            <thead>
                <tr>
                    <th>Компания/ФИО</th>
                    <th>Контактное лицо</th>
                    <th>Тип</th>
                    <th>Email</th>
                    <th>Телефон</th>
                </tr>
            </thead>
            <tbody>
                {% for contact in contacts %}
                <tr>
                    <td>{{ contact.company_name }}</td>
                    <td>{{ contact.contact_person or '-' }}</td>
                    <td>{{ contact.type }}</td>
                    <td>{{ contact.email or '-' }}</td>
                    <td>{{ contact.phone or '-' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        {% else %}
        <p style="color: #666; font-style: italic;">Нет связанных контактов</p>
        {% endif %}
        
        <div class="page-break"></div>
        
        <!-- Раздел 5: Файлы -->
        <h2>5. ФАЙЛЫ</h2>
        
        {% if file_manifest %}
        <table>
            <thead>
                <tr>
                    <th>Имя файла</th>
                    <th>Размер</th>
                    <th>Кем загружен</th>
                    <th>Дата загрузки</th>
                    <th>Прикреплен к</th>
                </tr>
            </thead>
            <tbody>
                {% for file in file_manifest %}
                <tr>
                    <td>{{ file.filename }}</td>
                    <td>{{ "%.2f"|format(file.size / 1024) }} KB</td>
                    <td>{{ file.uploaded_by }}</td>
                    <td>{{ file.uploaded_at.strftime('%d.%m.%Y %H:%M') if file.uploaded_at else '-' }}</td>
                    <td>{{ file.attached_to }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        {% else %}
        <p style="color: #666; font-style: italic;">Нет загруженных файлов</p>
        {% endif %}
    </body>
    </html>
    """
    
    try:
        # Рендерим HTML из шаблона
        template = Template(html_template)
        html_content = template.render(**project_data)
        
        # Конвертируем HTML в PDF
        pdf_data = HTML(string=html_content).write_pdf()
        
        # Создаем временный файл для PDF
        temp_dir = tempfile.gettempdir()
        pdf_filename = f"board_{board_id}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        pdf_path = os.path.join(temp_dir, pdf_filename)
        
        with open(pdf_path, 'wb') as f:
            f.write(pdf_data)
        
        # Возвращаем PDF для скачивания
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=pdf_filename,
            headers={"Content-Disposition": f"attachment; filename={pdf_filename}"}
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error generating PDF: {str(e)}")
        print(f"Traceback: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании PDF: {str(e)}"
        )

