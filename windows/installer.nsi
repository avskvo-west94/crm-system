; Скрипт установщика NSIS для Windows 10
; =============================================================================
; Создает полноценный установщик с Docker Desktop и всеми компонентами

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Имя и версия программы
Name "СУП - Система Управления Проектами"
OutFile "SUP_System_Setup.exe"
InstallDir "$PROFILE\SUP System"
RequestExecutionLevel admin

; Интерфейс установщика
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_WELCOMEPAGE_TITLE "Установка СУП - Система Управления Проектами"
!define MUI_WELCOMEPAGE_TEXT "Этот мастер установит систему СУП на ваш компьютер.$\r$\n$\r$\nВключает Docker Desktop и все необходимые компоненты."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "Russian"

; Основная секция установки
Section "Основная установка" SecMain

    ; Установка в выбранную директорию
    SetOutPath "$INSTDIR"
    
    ; Копирование файлов проекта
    File /r "backend"
    File /r "frontend"
    File /r "nginx"
    File "docker-compose.yml"
    File ".env.example"
    File "windows\start_sup.bat"
    File "windows\stop_sup.bat"
    File "windows\restart_sup.bat"
    
    ; Создание .env файла
    IfFileExists "$INSTDIR\.env" SkipEnvCreation 0
        CopyFiles "$INSTDIR\.env.example" "$INSTDIR\.env"
        ; Замена IP адреса на localhost
        !define TEMP_FILE "$INSTDIR\.env.tmp"
        FileOpen $0 "$INSTDIR\.env" r
        FileOpen $1 "${TEMP_FILE}" w
        loop:
            FileRead $0 $2
            StrCmp $2 "" done
            ${StrReplace} $2 "10.0.0.45" "localhost" $2
            FileWrite $1 $2
            Goto loop
        done:
        FileClose $0
        FileClose $1
        Delete "$INSTDIR\.env"
        Rename "${TEMP_FILE}" "$INSTDIR\.env"
    SkipEnvCreation:
    
    ; Создание директорий
    CreateDirectory "$INSTDIR\backups"
    
    ; Проверка и установка Docker Desktop
    SectionGetFlags ${SecDocker} $0
    IntOp $0 $0 & ${SF_SELECTED}
    IntCmp $0 0 SkipDockerInstall
    
        ; Проверка наличия установщика Docker Desktop
        IfFileExists "$EXEDIR\Docker Desktop Installer.exe" 0 DockerNotFound
            ExecWait '"$EXEDIR\Docker Desktop Installer.exe" /S'
            Sleep 30000
            
            ; Запуск Docker Desktop
            IfFileExists "$PROGRAMFILES\Docker\Docker\Docker Desktop.exe" 0 SkipDockerStart
                Exec '"$PROGRAMFILES\Docker\Docker\Docker Desktop.exe"'
                Sleep 60000
            SkipDockerStart:
            Goto SkipDockerInstall
            
        DockerNotFound:
            MessageBox MB_OK|MB_ICONEXCLAMATION "Установщик Docker Desktop не найден!$\r$\n$\r$\nПожалуйста, скачайте Docker Desktop с официального сайта:$\r$\nhttps://www.docker.com/products/docker-desktop/"
    
    SkipDockerInstall:
    
    ; Создание ярлыка на рабочем столе
    CreateShortcut "$DESKTOP\СУП - Система Управления Проектами.lnk" "$INSTDIR\start_sup.bat" "" "$INSTDIR\start_sup.bat" 0
    
    ; Создание записи в меню Пуск
    CreateDirectory "$SMPROGRAMS\СУП - Система Управления Проектами"
    CreateShortcut "$SMPROGRAMS\СУП - Система Управления Проектами\Запустить СУП.lnk" "$INSTDIR\start_sup.bat"
    CreateShortcut "$SMPROGRAMS\СУП - Система Управления Проектами\Остановить СУП.lnk" "$INSTDIR\stop_sup.bat"
    CreateShortcut "$SMPROGRAMS\СУП - Система Управления Проектами\Перезапустить СУП.lnk" "$INSTDIR\restart_sup.bat"
    
    ; Запись в реестр для автозапуска (опционально)
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SUP System" "$INSTDIR\start_sup.bat"
    
    ; Запись информации для деинсталляции
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SUP System" "DisplayName" "СУП - Система Управления Проектами"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SUP System" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SUP System" "InstallLocation" "$INSTDIR"
    
SectionEnd

; Секция установки Docker Desktop
Section "Docker Desktop" SecDocker
    ; Docker Desktop будет установлен в основной секции если выбран
SectionEnd

; Секция деинсталляции
Section "Uninstall"
    
    ; Остановка системы
    ExecWait '"$INSTDIR\stop_sup.bat"'
    
    ; Удаление файлов
    RMDir /r "$INSTDIR"
    
    ; Удаление ярлыков
    Delete "$DESKTOP\СУП - Система Управления Проектами.lnk"
    RMDir /r "$SMPROGRAMS\СУП - Система Управления Проектами"
    
    ; Удаление из автозапуска
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SUP System"
    
    ; Удаление из реестра
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SUP System"
    
SectionEnd

; Функция для замены строк
Function StrReplace
    Exch $0 ; replacement
    Exch
    Exch $1 ; search string
    Exch
    Exch 2
    Exch $2 ; source string
    Push $3
    Push $4
    Push $5
    Push $6
    StrCpy $3 ""
    StrCpy $4 ""
    StrCpy $5 0
    StrLen $6 $1
    loop:
        StrCpy $4 $2 $6 $5
        StrCmp $4 $1 replace
        StrCpy $3 "$3$4"
        StrCmp $5 0 done
        IntOp $5 $5 + 1
        StrCmp $2 "" done loop
    replace:
        StrCpy $3 "$3$0"
        IntOp $5 $5 + $6
        Goto loop
    done:
        StrCpy $0 $3
        Pop $6
        Pop $5
        Pop $4
        Pop $3
        Pop $2
        Pop $1
        Exch $0
FunctionEnd

