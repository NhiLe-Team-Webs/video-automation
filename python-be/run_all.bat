@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "SOURCE_VIDEO=%SCRIPT_DIR%..\public\input\input.mp4"
set "AUTOEDIT_ENABLED=true"

:parse_args
if "%~1"=="" goto after_args
if /I "%~1"=="--autoedit" (
  shift
  if "%~1"=="" (
    echo [ERROR] --autoedit requires a value (true/false)
    exit /b 1
  )
  set "AUTOEDIT_ENABLED=%~1"
  goto shift_args
)
for /f "tokens=1* delims==" %%A in ("%~1") do (
  if /I "%%A"=="--autoedit" (
    set "AUTOEDIT_ENABLED=%%B"
    goto shift_args
  )
)
set "SOURCE_VIDEO=%~1"

:shift_args
shift
goto parse_args

:after_args
for /f "delims=" %%I in ('python -c "import sys;print(sys.argv[1].lower())" "%AUTOEDIT_ENABLED%"') do set "AUTOEDIT_ENABLED=%%I"
if /I not "%AUTOEDIT_ENABLED%"=="true" if /I not "%AUTOEDIT_ENABLED%"=="false" (
  echo [ERROR] --autoedit expects true or false, got '%AUTOEDIT_ENABLED%'
  exit /b 1
)

set "OUTPUT_DIR=%SCRIPT_DIR%outputs"
set "PUBLIC_ROOT=%SCRIPT_DIR%..\public"
set "PUBLIC_INPUT=%PUBLIC_ROOT%\input"
set "AUTO_EDITOR_OUTPUT=%OUTPUT_DIR%\stage1_cut.mp4"
set "WHISPER_SRT=%OUTPUT_DIR%\stage1_cut.srt"
set "PLAN_TMP=%OUTPUT_DIR%\plan.json"
set "PLAN_MAPPING=%SCRIPT_DIR%plan\mapping.json"
set "CONFIG_FILE=%SCRIPT_DIR%..\config\video_editing.json"

if not exist "%SOURCE_VIDEO%" (
  echo [ERROR] Khong tim thay video dau vao: %SOURCE_VIDEO%
  exit /b 1
)

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if not exist "%PUBLIC_INPUT%" mkdir "%PUBLIC_INPUT%"

for /f "tokens=1-4 delims=|" %%A in ('python scripts\read_autoedit_config.py "%CONFIG_FILE%"') do (
  set "AUTOEDITOR_THRESHOLD=%%A"
  set "AUTOEDITOR_MARGIN=%%B"
  set "AUTOEDITOR_SILENT_SPEED=%%C"
  set "AUTOEDITOR_VIDEO_SPEED=%%D"
)
if "%AUTOEDITOR_THRESHOLD%"=="" set "AUTOEDITOR_THRESHOLD=0.06"
if "%AUTOEDITOR_MARGIN%"=="" set "AUTOEDITOR_MARGIN=0.75s,1s"
if "%AUTOEDITOR_SILENT_SPEED%"=="" set "AUTOEDITOR_SILENT_SPEED=4"
if "%AUTOEDITOR_VIDEO_SPEED%"=="" set "AUTOEDITOR_VIDEO_SPEED=1"

set "SOURCE_FOR_TRANSCRIPTION=%SOURCE_VIDEO%"
if /I "%AUTOEDIT_ENABLED%"=="true" (
  echo 🎬 Auto-Editor trimming with smooth-pace preset…
  python -c "import auto_editor" >nul 2>&1
  if errorlevel 1 (
    echo [INFO] Auto-Editor not found. Installing...
    python -m pip install --quiet auto-editor
    if errorlevel 1 (
      echo [WARN] Failed to install Auto-Editor. Skipping trimming.
      set "AUTOEDIT_ENABLED=false"
    )
  )

  if /I "%AUTOEDIT_ENABLED%"=="true" (
    set "AUTO_EDITOR_LOG=%OUTPUT_DIR%\auto_editor.log"
    python -m auto_editor "%SOURCE_VIDEO%" ^
      --output "%AUTO_EDITOR_OUTPUT%" ^
      --edit "audio:threshold=%AUTOEDITOR_THRESHOLD%" ^
      --margin "%AUTOEDITOR_MARGIN%" ^
      --silent-speed "%AUTOEDITOR_SILENT_SPEED%" ^
      --video-speed "%AUTOEDITOR_VIDEO_SPEED%" 1>"%AUTO_EDITOR_LOG%" 2>&1
    if errorlevel 1 (
      type "%AUTO_EDITOR_LOG%"
      echo [WARN] Auto-Editor trimming failed. Using original video.
    ) else (
      type "%AUTO_EDITOR_LOG%"
      set "SOURCE_FOR_TRANSCRIPTION=%AUTO_EDITOR_OUTPUT%"
    )
    if exist "%AUTO_EDITOR_LOG%" del "%AUTO_EDITOR_LOG%" >nul 2>&1
  )
) else (
  echo [INFO] Auto-Editor trimming skipped via flag.
)

echo [STEP] Whisper: tao transcript SRT => %WHISPER_SRT%
python -m whisper "%SOURCE_FOR_TRANSCRIPTION%" ^
  --model small ^
  --language en ^
  --task transcribe ^
  --output_format srt ^
  --output_dir "%OUTPUT_DIR%"

if not exist "%WHISPER_SRT%" (
  echo [ERROR] Whisper khong tao duoc file %WHISPER_SRT%
  exit /b 1
)

echo [STEP] Sinh plan Remotion (uu tien Gemini)
python scripts\make_plan_gemini.py "%WHISPER_SRT%" "%PLAN_TMP%"
if errorlevel 1 (
  echo [WARN] Gemini planner unavailable, fallback mapping.json
  python scripts\make_plan_from_srt.py "%WHISPER_SRT%" "%PLAN_MAPPING%" "%PLAN_TMP%"
) else (
  echo [INFO] Gemini plan generated successfully.
)

set "FINAL_VIDEO_PATH=%SOURCE_FOR_TRANSCRIPTION%"
if /I not "%FINAL_VIDEO_PATH%"=="%AUTO_EDITOR_OUTPUT%" (
  set "FINAL_VIDEO_PATH=%SOURCE_VIDEO%"
  copy /Y "%SOURCE_VIDEO%" "%AUTO_EDITOR_OUTPUT%" >nul
)

copy /Y "%FINAL_VIDEO_PATH%" "%PUBLIC_INPUT%\input.mp4" >nul
copy /Y "%PLAN_TMP%" "%PUBLIC_INPUT%\plan.json" >nul

echo [DONE] Da copy du lieu sang public\input\
echo        - Video: public\input\input.mp4
echo        - Plan:  public\input\plan.json
echo [NEXT] Chay: cd ..\remotion-app ^&^& npm install ^&^& npm run render
pause
