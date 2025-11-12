#!/bin/bash

# =============================================================================
# Скрипт восстановления проекта СУП из бэкапа
# =============================================================================
# 
# Этот скрипт восстанавливает проект из созданного бэкапа:
# - Восстанавливает базу данных PostgreSQL
# - Восстанавливает все файлы проекта
# - Восстанавливает загруженные пользователями файлы
# - Настраивает Docker окружение
#
# Использование:
#   ./restore_project.sh <путь_к_архиву_бэкапа>
#   ./restore_project.sh backups/sup_backup_20251031_120000.tar.gz
# =============================================================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
BACKUP_FILE="$1"
PROJECT_DIR="/home/user/crm-system"
RESTORE_DIR="${PROJECT_DIR}/restore_temp"
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

# Проверка аргументов
check_arguments() {
    if [ -z "$BACKUP_FILE" ]; then
        log_error "Не указан файл бэкапа!"
        echo ""
        echo "Использование:"
        echo "  $0 <путь_к_архиву_бэкапа>"
        echo ""
        echo "Пример:"
        echo "  $0 backups/sup_backup_20251031_120000.tar.gz"
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Файл бэкапа не найден: ${BACKUP_FILE}"
        exit 1
    fi
    
    log_success "Файл бэкапа найден: ${BACKUP_FILE}"
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

# Распаковка архива
extract_backup() {
    log_info "Распаковка архива бэкапа..."
    
    mkdir -p "${RESTORE_DIR}"
    
    tar xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}" || {
        log_error "Не удалось распаковать архив!"
        exit 1
    }
    
    # Находим директорию с бэкапом
    BACKUP_DIR=$(find "${RESTORE_DIR}" -maxdepth 1 -type d -name "sup_backup_*" | head -1)
    
    if [ -z "$BACKUP_DIR" ]; then
        log_error "Не удалось найти директорию бэкапа в архиве!"
        exit 1
    fi
    
    log_success "Архив распакован: ${BACKUP_DIR}"
}

# Восстановление файлов проекта
restore_project_files() {
    log_info "Восстановление файлов проекта..."
    
    cd "${PROJECT_DIR}"
    
    # Остановка контейнеров если они запущены
    if docker compose ps | grep -q "Up"; then
        log_warning "Останавливаем запущенные контейнеры..."
        docker compose down || true
    fi
    
    # Распаковка файлов проекта
    if [ -f "${BACKUP_DIR}/project/project_files.tar.gz" ]; then
        log_info "Распаковка файлов проекта..."
        tar xzf "${BACKUP_DIR}/project/project_files.tar.gz" -C "${PROJECT_DIR}" || {
            log_error "Не удалось распаковать файлы проекта!"
            exit 1
        }
        log_success "Файлы проекта восстановлены"
    else
        log_warning "Файлы проекта не найдены в бэкапе"
    fi
}

# Восстановление базы данных
restore_database() {
    log_info "Восстановление базы данных..."
    
    cd "${PROJECT_DIR}"
    
    # Запуск контейнеров если они не запущены
    if ! docker compose ps postgres | grep -q "Up"; then
        log_info "Запуск контейнеров..."
        docker compose up -d postgres
        
        # Ожидание готовности PostgreSQL
        log_info "Ожидание готовности PostgreSQL..."
        sleep 5
        
        for i in {1..30}; do
            if docker compose exec -T postgres pg_isready -U crm_user &> /dev/null; then
                break
            fi
            sleep 1
        done
    fi
    
    # Получение переменных окружения
    POSTGRES_USER=$(docker compose exec -T postgres printenv POSTGRES_USER | tr -d '\r' || echo "crm_user")
    POSTGRES_DB=$(docker compose exec -T postgres printenv POSTGRES_DB | tr -d '\r' || echo "crm_db")
    
    # Восстановление базы данных
    if [ -f "${BACKUP_DIR}/database/db_backup.dump" ]; then
        log_info "Восстановление из бинарного дампа..."
        
        # Удаление существующей базы данных
        docker compose exec -T postgres psql -U "${POSTGRES_USER}" -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" postgres || true
        
        # Создание новой базы данных
        docker compose exec -T postgres psql -U "${POSTGRES_USER}" -c "CREATE DATABASE ${POSTGRES_DB};" postgres || {
            log_error "Не удалось создать базу данных!"
            exit 1
        }
        
        # Копирование дампа в контейнер
        docker cp "${BACKUP_DIR}/database/db_backup.dump" crm_postgres:/tmp/db_backup.dump
        
        # Восстановление из дампа
        docker compose exec -T postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v /tmp/db_backup.dump || {
            log_error "Не удалось восстановить базу данных!"
            exit 1
        }
        
        log_success "База данных восстановлена"
    elif [ -f "${BACKUP_DIR}/database/db_backup.sql" ]; then
        log_info "Восстановление из SQL дампа..."
        
        # Удаление существующей базы данных
        docker compose exec -T postgres psql -U "${POSTGRES_USER}" -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" postgres || true
        
        # Создание новой базы данных
        docker compose exec -T postgres psql -U "${POSTGRES_USER}" -c "CREATE DATABASE ${POSTGRES_DB};" postgres || {
            log_error "Не удалось создать базу данных!"
            exit 1
        }
        
        # Восстановление из SQL
        docker compose exec -T postgres psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" < "${BACKUP_DIR}/database/db_backup.sql" || {
            log_error "Не удалось восстановить базу данных!"
            exit 1
        }
        
        log_success "База данных восстановлена"
    else
        log_error "Дамп базы данных не найден в бэкапе!"
        exit 1
    fi
}

# Восстановление файлов
restore_files() {
    log_info "Восстановление загруженных файлов..."
    
    if [ -f "${BACKUP_DIR}/files/uploads.tar.gz" ]; then
        # Запуск контейнеров если они не запущены
        if ! docker compose ps | grep -q "Up"; then
            docker compose up -d
            sleep 3
        fi
        
        # Восстановление файлов в volume
        if docker volume inspect crm-system_uploads &> /dev/null; then
            log_info "Восстановление файлов в Docker volume..."
            docker run --rm -v crm-system_uploads:/data -v "${BACKUP_DIR}/files":/backup alpine sh -c "cd /data && tar xzf /backup/uploads.tar.gz"
            log_success "Файлы восстановлены в volume"
        else
            log_warning "Docker volume не найден, восстанавливаю в локальную директорию..."
            mkdir -p "${PROJECT_DIR}/backend/uploads"
            tar xzf "${BACKUP_DIR}/files/uploads.tar.gz" -C "${PROJECT_DIR}/backend" || {
                log_warning "Не удалось восстановить файлы (но это не критично)"
            }
        fi
    else
        log_warning "Архив с файлами не найден в бэкапе"
    fi
}

# Настройка переменных окружения
setup_env() {
    log_info "Проверка переменных окружения..."
    
    cd "${PROJECT_DIR}"
    
    if [ ! -f ".env" ]; then
        log_warning "Файл .env не найден. Создаю из примера..."
        
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Создан файл .env из примера. ОБЯЗАТЕЛЬНО отредактируйте его!"
            log_warning "ВАЖНО: Отредактируйте файл .env перед запуском системы!"
        else
            log_error "Файл .env.example не найден!"
            log_info "Создайте файл .env вручную с необходимыми переменными"
        fi
    else
        log_success "Файл .env найден"
    fi
}

# Запуск системы
start_system() {
    log_info "Запуск системы..."
    
    cd "${PROJECT_DIR}"
    
    docker compose up -d || {
        log_error "Не удалось запустить систему!"
        exit 1
    }
    
    log_info "Ожидание запуска всех сервисов..."
    sleep 10
    
    # Проверка статуса контейнеров
    log_info "Проверка статуса контейнеров..."
    docker compose ps
    
    log_success "Система запущена"
}

# Получение IP адреса сервера
get_server_ip() {
    log_info "Определение IP адреса сервера..."
    
    # Пробуем найти IP в локальной сети
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' || echo "не определен")
    fi
    
    echo ""
    echo "============================================================================="
    log_success "ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!"
    echo "============================================================================="
    echo ""
    echo "Система доступна по адресу:"
    echo "  http://${SERVER_IP}"
    echo ""
    echo "Все IP адреса сервера:"
    hostname -I | tr ' ' '\n' | sed 's/^/  /'
    echo ""
    echo "Для просмотра логов используйте:"
    echo "  docker compose logs -f"
    echo ""
    echo "============================================================================="
    echo ""
}

# Очистка временных файлов
cleanup() {
    log_info "Очистка временных файлов..."
    rm -rf "${RESTORE_DIR}"
    log_success "Временные файлы удалены"
}

# Основная функция
main() {
    echo ""
    echo "============================================================================="
    echo "  ВОССТАНОВЛЕНИЕ ПРОЕКТА СУП ИЗ БЭКАПА"
    echo "============================================================================="
    echo ""
    
    check_arguments
    check_docker
    extract_backup
    restore_project_files
    restore_database
    restore_files
    setup_env
    start_system
    get_server_ip
    cleanup
    
    log_success "Восстановление завершено успешно!"
}

# Обработка прерывания
trap cleanup EXIT

# Запуск основной функции
main

