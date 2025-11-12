@echo off
REM =============================================================================
REM Скрипт установки СУП для Windows 10
REM =============================================================================

setlocal enabledelayedexpansion

REM Цвета для консоли
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

echo.
echo =============================================================================
echo   УСТАНОВКА СУП - Система Управления Проектами
echo =============================================================================
echo.

REM Проверка прав администратора
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%ОШИБКА: Скрипт должен быть запущен от имени администратора!%NC%
    echo.
    echo Нажмите правой кнопкой мыши на файл и выберите "Запуск от имени администратора"
    pause
    exit /b 1
)

REM Определение директории установки
set "INSTALL_DIR=C:\Program Files\SUP System"
set "INSTALL_DIR_USER=%USERPROFILE%\SUP System"

echo %GREEN%Начало установки...%NC%
echo.

REM Проверка наличия Docker Desktop
echo Проверка установки Docker Desktop...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%Docker Desktop не найден. Начинаю установку...%NC%
    
    REM Проверка наличия установщика Docker Desktop
    if exist "%~dp0Docker Desktop Installer.exe" (
        echo Запуск установщика Docker Desktop...
        start /wait "%~dp0Docker Desktop Installer.exe" /S
        echo Ожидание завершения установки Docker Desktop...
        timeout /t 30 /nobreak >nul
        
        REM Запуск Docker Desktop
        echo Запуск Docker Desktop...
        start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
        echo Ожидание запуска Docker Desktop (это может занять несколько минут)...
        timeout /t 60 /nobreak >nul
        
        REM Проверка после установки
        docker --version >nul 2>&1
        if %errorLevel% neq 0 (
            echo %RED%ОШИБКА: Docker Desktop не установлен или не запущен!%NC%
            echo Пожалуйста, установите Docker Desktop вручную и запустите установку снова.
            pause
            exit /b 1
        )
    ) else (
        echo %RED%ОШИБКА: Установщик Docker Desktop не найден!%NC%
        echo Пожалуйста, скачайте Docker Desktop с официального сайта:
        echo https://www.docker.com/products/docker-desktop/
        pause
        exit /b 1
    )
) else (
    echo %GREEN%Docker Desktop уже установлен.%NC%
)

REM Создание директории установки
echo.
echo Создание директории установки...
if not exist "%INSTALL_DIR_USER%" mkdir "%INSTALL_DIR_USER%"
if not exist "%INSTALL_DIR_USER%\backend" mkdir "%INSTALL_DIR_USER%\backend"
if not exist "%INSTALL_DIR_USER%\frontend" mkdir "%INSTALL_DIR_USER%\frontend"
if not exist "%INSTALL_DIR_USER%\nginx" mkdir "%INSTALL_DIR_USER%\nginx"
if not exist "%INSTALL_DIR_USER%\backups" mkdir "%INSTALL_DIR_USER%\backups"

REM Копирование файлов проекта
echo Копирование файлов проекта...
xcopy /E /I /Y "%~dp0backend" "%INSTALL_DIR_USER%\backend\" >nul
xcopy /E /I /Y "%~dp0frontend" "%INSTALL_DIR_USER%\frontend\" >nul
xcopy /E /I /Y "%~dp0nginx" "%INSTALL_DIR_USER%\nginx\" >nul
copy /Y "%~dp0docker-compose.yml" "%INSTALL_DIR_USER%\" >nul
copy /Y "%~dp0.env.example" "%INSTALL_DIR_USER%\.env.example" >nul

REM Создание файла .env если его нет
if not exist "%INSTALL_DIR_USER%\.env" (
    echo Создание файла конфигурации...
    copy /Y "%INSTALL_DIR_USER%\.env.example" "%INSTALL_DIR_USER%\.env" >nul
    
    REM Замена IP адреса на localhost для Windows
    powershell -Command "(Get-Content '%INSTALL_DIR_USER%\.env') -replace '10.0.0.45', 'localhost' | Set-Content '%INSTALL_DIR_USER%\.env'"
)

REM Создание скрипта запуска
echo Создание скрипта запуска...
(
echo @echo off
echo cd /d "%INSTALL_DIR_USER%"
echo docker compose up -d
echo echo.
echo echo Система запущена!
echo echo Откройте браузер и перейдите по адресу: http://localhost
echo pause
) > "%INSTALL_DIR_USER%\start_sup.bat"

REM Создание скрипта остановки
(
echo @echo off
echo cd /d "%INSTALL_DIR_USER%"
echo docker compose down
echo pause
) > "%INSTALL_DIR_USER%\stop_sup.bat"

REM Создание скрипта перезапуска
(
echo @echo off
echo cd /d "%INSTALL_DIR_USER%"
echo docker compose restart
echo pause
) > "%INSTALL_DIR_USER%\restart_sup.bat"

REM Создание ярлыка на рабочем столе
echo Создание ярлыка на рабочем столе...
set "DESKTOP=%USERPROFILE%\Desktop"
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\СУП - Система Управления Проектами.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR_USER%\start_sup.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR_USER%'; $Shortcut.IconLocation = 'shell32.dll,137'; $Shortcut.Save()"

REM Создание записи в реестре для автозапуска (опционально)
echo.
set /p AUTO_START="Запускать систему автоматически при загрузке Windows? (Y/N): "
if /i "!AUTO_START!"=="Y" (
    echo Настройка автозапуска...
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "SUP System" /t REG_SZ /d "\"%INSTALL_DIR_USER%\start_sup.bat\"" /f >nul
    echo %GREEN%Автозапуск настроен!%NC%
)

REM Запуск системы
echo.
echo %GREEN%Установка завершена!%NC%
echo.
set /p START_NOW="Запустить систему сейчас? (Y/N): "
if /i "!START_NOW!"=="Y" (
    echo Запуск системы...
    cd /d "%INSTALL_DIR_USER%"
    docker compose up -d
    echo.
    echo %GREEN%Система запущена!%NC%
    echo.
    echo Откройте браузер и перейдите по адресу: http://localhost
    echo.
    echo Для управления системой используйте скрипты:
    echo   - start_sup.bat   - Запустить систему
    echo   - stop_sup.bat    - Остановить систему
    echo   - restart_sup.bat - Перезапустить систему
    echo.
    pause
)

echo.
echo =============================================================================
echo   УСТАНОВКА ЗАВЕРШЕНА
echo =============================================================================
echo.
echo Система установлена в: %INSTALL_DIR_USER%
echo.
echo Для запуска системы используйте ярлык на рабочем столе
echo или запустите файл: %INSTALL_DIR_USER%\start_sup.bat
echo.
pause

