#!/bin/bash

# =============================================================================
# Скрипт создания полного бэкапа проекта СУП (Система управления проектами)
# =============================================================================
# 
# Этот скрипт создает полную копию проекта, включая:
# - Базу данных PostgreSQL
# - Все файлы проекта
# - Загруженные пользователями файлы
# - Конфигурацию Docker
# - Переменные окружения
#
# Созданный бэкап можно развернуть на другом сервере или восстановить на текущем
# =============================================================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
PROJECT_DIR="/home/user/crm-system"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="sup_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
check_root() {
    if [ "$EUID" -eq 0 ]; then 
        log_warning "Скрипт запущен от root. Рекомендуется запускать от обычного пользователя."
    fi
}

# Проверка наличия Docker и Docker Compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен! Установите Docker перед использованием скрипта."
        exit 1
    fi
    
    if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
        log_error "Docker Compose не установлен! Установите Docker Compose перед использованием скрипта."
        exit 1
    fi
    
    log_success "Docker и Docker Compose найдены"
}

# Создание директории для бэкапа
create_backup_dir() {
    log_info "Создание директории для бэкапа..."
    mkdir -p "${BACKUP_PATH}"
    mkdir -p "${BACKUP_PATH}/database"
    mkdir -p "${BACKUP_PATH}/files"
    mkdir -p "${BACKUP_PATH}/project"
    mkdir -p "${BACKUP_PATH}/docker"
    log_success "Директории созданы"
}

# Бэкап базы данных
backup_database() {
    log_info "Создание бэкапа базы данных..."
    
    cd "${PROJECT_DIR}"
    
    # Проверка существования контейнера PostgreSQL
    if ! docker compose ps postgres | grep -q "Up"; then
        log_error "Контейнер PostgreSQL не запущен!"
        exit 1
    fi
    
    # Получение переменных окружения из docker-compose
    POSTGRES_USER=$(docker compose exec -T postgres printenv POSTGRES_USER | tr -d '\r' || echo "crm_user")
    POSTGRES_DB=$(docker compose exec -T postgres printenv POSTGRES_DB | tr -d '\r' || echo "crm_db")
    
    # Создание дампа базы данных
    docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -F c -b -v -f "/backups/db_backup.dump" "${POSTGRES_DB}" || {
        log_error "Не удалось создать бэкап базы данных!"
        exit 1
    }
    
    # Копирование дампа из контейнера
    docker cp crm_postgres:/backups/db_backup.dump "${BACKUP_PATH}/database/db_backup.dump" || {
        log_error "Не удалось скопировать дамп базы данных!"
        exit 1
    }
    
    # Также создаем SQL дамп для удобства
    docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "${BACKUP_PATH}/database/db_backup.sql" || {
        log_warning "Не удалось создать SQL дамп (но это не критично)"
    }
    
    log_success "Бэкап базы данных создан"
}

# Бэкап загруженных файлов
backup_files() {
    log_info "Создание бэкапа загруженных файлов..."
    
    # Копирование файлов из volume
    if docker volume inspect crm-system_uploads &> /dev/null; then
        log_info "Копирование файлов из Docker volume..."
        docker run --rm -v crm-system_uploads:/data -v "${BACKUP_PATH}/files":/backup alpine tar czf /backup/uploads.tar.gz -C /data .
        log_success "Файлы из volume скопированы"
    else
        log_warning "Docker volume uploads не найден, проверяю локальную директорию..."
        if [ -d "${PROJECT_DIR}/backend/uploads" ]; then
            tar czf "${BACKUP_PATH}/files/uploads.tar.gz" -C "${PROJECT_DIR}/backend" uploads/
            log_success "Локальные файлы скопированы"
        else
            log_warning "Директория uploads не найдена"
        fi
    fi
}

# Бэкап проекта
backup_project() {
    log_info "Создание бэкапа файлов проекта..."
    
    cd "${PROJECT_DIR}"
    
    # Исключаем ненужные директории и файлы
    tar czf "${BACKUP_PATH}/project/project_files.tar.gz" \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='*.log' \
        --exclude='backups' \
        --exclude='.env' \
        --exclude='backend/uploads' \
        --exclude='.DS_Store' \
        \
        backend/ \
        frontend/ \
        nginx/ \
        docker-compose.yml \
        README.md \
        ADMIN_GUIDE.md \
        PASSWORD_RECOVERY.md \
        QUICK_START.md \
        SECURITY_TOKEN.txt \
        backup_project.sh \
        restore_project.sh \
        DEPLOYMENT_GUIDE.md \
        .gitignore || {
        log_error "Не удалось создать архив проекта!"
        exit 1
    }
    
    log_success "Бэкап проекта создан"
}

# Бэкап конфигурации Docker
backup_docker_config() {
    log_info "Создание бэкапа конфигурации Docker..."
    
    # Сохранение информации о контейнерах
    docker compose ps > "${BACKUP_PATH}/docker/containers_status.txt" 2>/dev/null || true
    
    # Сохранение версий образов
    docker images > "${BACKUP_PATH}/docker/docker_images.txt" 2>/dev/null || true
    
    # Сохранение информации о volumes
    docker volume ls > "${BACKUP_PATH}/docker/docker_volumes.txt" 2>/dev/null || true
    
    log_success "Информация о Docker сохранена"
}

# Создание файла с информацией о бэкапе
create_backup_info() {
    log_info "Создание файла с информацией о бэкапе..."
    
    cat > "${BACKUP_PATH}/backup_info.txt" << EOF
=============================================================================
  ИНФОРМАЦИЯ О БЭКАПЕ ПРОЕКТА СУП
=============================================================================

Дата создания: $(date '+%Y-%m-%d %H:%M:%S')
Версия скрипта: 1.0

СОДЕРЖИМОЕ БЭКАПА:
-----------------
1. База данных PostgreSQL:
   - database/db_backup.dump (бинарный дамп)
   - database/db_backup.sql (SQL дамп)

2. Загруженные файлы:
   - files/uploads.tar.gz

3. Файлы проекта:
   - project/project_files.tar.gz

4. Конфигурация Docker:
   - docker/containers_status.txt
   - docker/docker_images.txt
   - docker/docker_volumes.txt

ИНФОРМАЦИЯ О СИСТЕМЕ:
---------------------
ОС: $(uname -a)
Docker версия: $(docker --version)
Docker Compose версия: $(docker compose version 2>/dev/null || docker-compose version)

IP АДРЕС СЕРВЕРА:
-----------------
Текущий IP: $(hostname -I | awk '{print $1}')
Все IP адреса: $(hostname -I)

ПОРТЫ:
------
- HTTP: 80
- HTTPS: 443
- PostgreSQL: 5432
- Backend API: 8000
- Frontend: 3000

ВАЖНО:
------
- Этот бэкап содержит всю информацию о проекте
- Храните его в безопасном месте
- Для восстановления используйте скрипт restore_project.sh
- Перед восстановлением на новом сервере убедитесь, что:
  * Установлен Docker и Docker Compose
  * Открыты необходимые порты в firewall
  * Достаточно места на диске (минимум 10GB свободного места)

=============================================================================
EOF

    log_success "Файл с информацией создан"
}

# Создание единого архива
create_final_archive() {
    log_info "Создание финального архива..."
    
    cd "${BACKUP_DIR}"
    
    tar czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}" || {
        log_error "Не удалось создать финальный архив!"
        exit 1
    }
    
    # Удаление временной директории
    rm -rf "${BACKUP_PATH}"
    
    ARCHIVE_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    
    log_success "Финальный архив создан: ${BACKUP_NAME}.tar.gz"
    log_info "Размер архива: ${ARCHIVE_SIZE}"
    log_info "Путь к архиву: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

# Основная функция
main() {
    echo ""
    echo "============================================================================="
    echo "  СОЗДАНИЕ БЭКАПА ПРОЕКТА СУП"
    echo "============================================================================="
    echo ""
    
    check_root
    check_docker
    create_backup_dir
    backup_database
    backup_files
    backup_project
    backup_docker_config
    create_backup_info
    create_final_archive
    
    echo ""
    echo "============================================================================="
    log_success "БЭКАП УСПЕШНО СОЗДАН!"
    echo "============================================================================="
    echo ""
    echo "Архив: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo ""
    echo "Для восстановления используйте:"
    echo "  ./restore_project.sh ${BACKUP_NAME}.tar.gz"
    echo ""
    echo "============================================================================="
    echo ""
}

# Запуск основной функции
main

