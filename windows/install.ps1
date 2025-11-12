# Скрипт установки СУП для Windows 10 (PowerShell)
# =============================================================================
# Более продвинутая версия установщика с проверками и настройками

param(
    [switch]$Silent,
    [string]$InstallPath = "$env:USERPROFILE\SUP System"
)

$ErrorActionPreference = "Stop"

# Функции для цветного вывода
function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

# Проверка прав администратора
function Test-Administrator {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Проверка и установка Docker Desktop
function Install-DockerDesktop {
    Write-Info "Проверка Docker Desktop..."
    
    # Проверка установки
    $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerInstalled) {
        Write-Success "Docker Desktop уже установлен"
        return $true
    }
    
    # Поиск установщика Docker Desktop
    $installerPath = Join-Path $PSScriptRoot "Docker Desktop Installer.exe"
    if (-not (Test-Path $installerPath)) {
        Write-Error "Установщик Docker Desktop не найден!"
        Write-Info "Пожалуйста, скачайте Docker Desktop с официального сайта:"
        Write-Info "https://www.docker.com/products/docker-desktop/"
        return $false
    }
    
    Write-Info "Установка Docker Desktop..."
    try {
        Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -NoNewWindow
        Start-Sleep -Seconds 30
        
        # Запуск Docker Desktop
        $dockerDesktopPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktopPath) {
            Start-Process -FilePath $dockerDesktopPath
            Write-Info "Ожидание запуска Docker Desktop (это может занять несколько минут)..."
            Start-Sleep -Seconds 60
            
            # Проверка установки
            $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
            if ($dockerInstalled) {
                Write-Success "Docker Desktop установлен и запущен"
                return $true
            }
        }
    } catch {
        Write-Error "Ошибка при установке Docker Desktop: $_"
        return $false
    }
    
    return $false
}

# Установка проекта
function Install-Project {
    Write-Info "Установка проекта СУП..."
    
    # Создание директорий
    $directories = @(
        $InstallPath,
        (Join-Path $InstallPath "backend"),
        (Join-Path $InstallPath "frontend"),
        (Join-Path $InstallPath "nginx"),
        (Join-Path $InstallPath "backups")
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    # Копирование файлов
    Write-Info "Копирование файлов проекта..."
    
    $sourceDirs = @("backend", "frontend", "nginx")
    foreach ($dir in $sourceDirs) {
        $sourcePath = Join-Path $PSScriptRoot "..\$dir"
        $destPath = Join-Path $InstallPath $dir
        
        if (Test-Path $sourcePath) {
            Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force
            Write-Success "Скопировано: $dir"
        }
    }
    
    # Копирование файлов конфигурации
    $configFiles = @("docker-compose.yml", ".env.example")
    foreach ($file in $configFiles) {
        $sourceFile = Join-Path $PSScriptRoot "..\$file"
        if (Test-Path $sourceFile) {
            Copy-Item -Path $sourceFile -Destination (Join-Path $InstallPath $file) -Force
        }
    }
    
    # Создание .env файла
    $envFile = Join-Path $InstallPath ".env"
    $envExample = Join-Path $InstallPath ".env.example"
    
    if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
        Copy-Item -Path $envExample -Destination $envFile -Force
        
        # Замена IP адреса на localhost
        $content = Get-Content $envFile
        $content = $content -replace '10\.0\.0\.45', 'localhost'
        $content | Set-Content $envFile
    }
    
    Write-Success "Проект установлен в: $InstallPath"
}

# Создание скриптов управления
function Create-ManagementScripts {
    Write-Info "Создание скриптов управления..."
    
    $scripts = @{
        "start_sup.bat" = @"
@echo off
cd /d "$InstallPath"
docker compose up -d
if %errorLevel% equ 0 (
    echo.
    echo Система запущена!
    echo Откройте браузер: http://localhost
) else (
    echo Ошибка при запуске!
)
pause
"@
        "stop_sup.bat" = @"
@echo off
cd /d "$InstallPath"
docker compose down
pause
"@
        "restart_sup.bat" = @"
@echo off
cd /d "$InstallPath"
docker compose restart
pause
"@
    }
    
    foreach ($scriptName in $scripts.Keys) {
        $scriptPath = Join-Path $InstallPath $scriptName
        $scripts[$scriptName] | Out-File -FilePath $scriptPath -Encoding ASCII
        Write-Success "Создан: $scriptName"
    }
}

# Создание ярлыка на рабочем столе
function Create-DesktopShortcut {
    Write-Info "Создание ярлыка на рабочем столе..."
    
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktop "СУП - Система Управления Проектами.lnk"
    $targetPath = Join-Path $InstallPath "start_sup.bat"
    
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $targetPath
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.IconLocation = "shell32.dll,137"
    $Shortcut.Description = "СУП - Система Управления Проектами"
    $Shortcut.Save()
    
    Write-Success "Ярлык создан на рабочем столе"
}

# Настройка автозапуска
function Set-AutoStart {
    if (-not $Silent) {
        $response = Read-Host "Запускать систему автоматически при загрузке Windows? (Y/N)"
        if ($response -ne "Y" -and $response -ne "y") {
            return
        }
    }
    
    Write-Info "Настройка автозапуска..."
    
    $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    $regName = "SUP System"
    $regValue = "`"$(Join-Path $InstallPath 'start_sup.bat')`""
    
    Set-ItemProperty -Path $regPath -Name $regName -Value $regValue -Force | Out-Null
    Write-Success "Автозапуск настроен"
}

# Основная функция установки
function Start-Installation {
    Write-Host ""
    Write-Host "=============================================================================" -ForegroundColor Cyan
    Write-Host "  УСТАНОВКА СУП - Система Управления Проектами" -ForegroundColor Cyan
    Write-Host "=============================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Проверка прав администратора
    if (-not (Test-Administrator)) {
        Write-Error "Скрипт должен быть запущен от имени администратора!"
        Write-Info "Нажмите правой кнопкой мыши и выберите 'Запуск от имени администратора'"
        return $false
    }
    
    # Установка Docker Desktop
    if (-not (Install-DockerDesktop)) {
        Write-Error "Не удалось установить Docker Desktop!"
        return $false
    }
    
    # Установка проекта
    Install-Project
    
    # Создание скриптов
    Create-ManagementScripts
    
    # Создание ярлыка
    Create-DesktopShortcut
    
    # Настройка автозапуска
    Set-AutoStart
    
    Write-Host ""
    Write-Host "=============================================================================" -ForegroundColor Green
    Write-Host "  УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!" -ForegroundColor Green
    Write-Host "=============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Success "Система установлена в: $InstallPath"
    Write-Host ""
    
    if (-not $Silent) {
        $startNow = Read-Host "Запустить систему сейчас? (Y/N)"
        if ($startNow -eq "Y" -or $startNow -eq "y") {
            Write-Info "Запуск системы..."
            Set-Location $InstallPath
            docker compose up -d
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Система запущена!"
                Write-Info "Откройте браузер: http://localhost"
                Start-Process "http://localhost"
            } else {
                Write-Error "Ошибка при запуске системы!"
            }
        }
    }
    
    return $true
}

# Запуск установки
Start-Installation

