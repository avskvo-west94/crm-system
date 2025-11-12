#!/bin/bash

# =============================================================================
# Скрипт настройки автоматического запуска системы СУП при загрузке ОС
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

PROJECT_DIR="/home/user/crm-system"
SERVICE_FILE="sup-system.service"
SERVICE_PATH="/etc/systemd/system/${SERVICE_FILE}"

echo ""
echo "============================================================================="
echo "  НАСТРОЙКА АВТОМАТИЧЕСКОГО ЗАПУСКА СИСТЕМЫ СУП"
echo "============================================================================="
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    log_error "Этот скрипт должен быть запущен от root (используйте sudo)"
    exit 1
fi

# Проверка наличия docker compose
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен!"
    exit 1
fi

if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    log_error "Docker Compose не установлен!"
    exit 1
fi

log_info "Проверка Docker сервиса..."
if systemctl is-enabled docker &> /dev/null; then
    log_success "Docker настроен на автоматический запуск"
else
    log_warning "Включение автоматического запуска Docker..."
    systemctl enable docker
    log_success "Docker настроен на автоматический запуск"
fi

# Копирование файла сервиса
log_info "Создание systemd сервиса..."
if [ -f "${PROJECT_DIR}/${SERVICE_FILE}" ]; then
    cp "${PROJECT_DIR}/${SERVICE_FILE}" "${SERVICE_PATH}"
    log_success "Файл сервиса скопирован"
else
    log_error "Файл ${SERVICE_FILE} не найден в ${PROJECT_DIR}"
    exit 1
fi

# Обновление systemd
log_info "Обновление конфигурации systemd..."
systemctl daemon-reload

# Включение автозапуска
log_info "Включение автозапуска системы СУП..."
systemctl enable sup-system.service

log_success "Автозапуск настроен!"

# Проверка статуса
log_info "Текущий статус сервиса:"
systemctl status sup-system.service --no-pager || true

echo ""
echo "============================================================================="
log_success "НАСТРОЙКА ЗАВЕРШЕНА!"
echo "============================================================================="
echo ""
echo "Управление сервисом:"
echo "  sudo systemctl start sup-system    - Запустить систему"
echo "  sudo systemctl stop sup-system     - Остановить систему"
echo "  sudo systemctl restart sup-system  - Перезапустить систему"
echo "  sudo systemctl status sup-system   - Проверить статус"
echo ""
echo "Система будет автоматически запускаться при загрузке сервера!"
echo ""
echo "============================================================================="
echo ""

