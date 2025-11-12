"""
Main FastAPI application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import threading

from app.core.config import settings
from app.api.api import api_router
from app.tasks.cleanup import start_background_tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Запуск фоновых задач...")
    background_thread = threading.Thread(target=start_background_tasks, daemon=True)
    background_thread.start()
    print("✅ Фоновые задачи запущены")
    
    yield
    
    # Shutdown
    print("⏹️  Остановка фоновых задач...")

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Configure CORS
# Разрешаем все origins для локальной сети без credentials (чтобы не было конфликта)
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Для локальной сети без настроенных origins используем без credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount uploads directory
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CRM System API",
        "version": settings.VERSION,
        "docs": "/api/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}

