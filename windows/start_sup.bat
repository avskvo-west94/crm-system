@echo off
REM =============================================================================
REM Скрипт запуска СУП для Windows 10
REM =============================================================================

cd /d "%~dp0"

echo =============================================================================
echo   СУП - Система Управления Проектами
echo =============================================================================
echo.

REM Проверка наличия Docker
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ОШИБКА: Docker Desktop не установлен или не запущен!
    echo.
    echo Пожалуйста:
    echo 1. Установите Docker Desktop с официального сайта
    echo 2. Запустите Docker Desktop
    echo 3. Подождите пока Docker полностью запустится
    echo 4. Запустите этот скрипт снова
    echo.
    pause
    exit /b 1
)

REM Проверка запущен ли Docker
docker ps >nul 2>&1
if %errorLevel% neq 0 (
    echo Docker не запущен. Попытка запуска...
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    echo Ожидание запуска Docker Desktop (это может занять несколько минут)...
    timeout /t 30 /nobreak >nul
    
    REM Повторная проверка
    docker ps >nul 2>&1
    if %errorLevel% neq 0 (
        echo ОШИБКА: Не удалось запустить Docker Desktop!
        echo Пожалуйста, запустите Docker Desktop вручную и попробуйте снова.
        pause
        exit /b 1
    )
)

echo Запуск системы...
docker compose up -d

if %errorLevel% equ 0 (
    echo.
    echo =============================================================================
    echo   Система успешно запущена!
    echo =============================================================================
    echo.
    echo Откройте браузер и перейдите по адресу:
    echo   http://localhost
    echo.
    echo Для остановки системы используйте: stop_sup.bat
    echo.
) else (
    echo.
    echo ОШИБКА при запуске системы!
    echo Проверьте логи: docker compose logs
    echo.
)

pause

