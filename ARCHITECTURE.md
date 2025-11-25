# Архитектура СУП

## Общие принципы

- **Монолитная архитектура** — все компоненты работают у нично
- **FastAPI backend** — скорость раработки да легкость
- **React SPA** — отзывчивый интерфейс
- **PostgreSQL** — надежные данные

## Технологии

### Backend
- Python 3.11
- FastAPI + Pydantic
- SQLAlchemy ORM
- Alembic migrations
- JWT authentication

### Frontend  
- React 18 + TypeScript
- Vite bundler
- Tailwind CSS
- React Query for API calls

### Infrastructure
- Docker & Docker Compose
- Nginx proxy
- PostgreSQL container
