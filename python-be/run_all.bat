@echo off
setlocal ENABLEEXTENSIONS

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "SOURCE_VIDEO=%~1"
if "%SOURCE_VIDEO%"=="" set "SOURCE_VIDEO=inputs\input.mp4"

set "OUTPUT_DIR=%SCRIPT_DIR%outputs"
set "REMOTION_PUBLIC=%SCRIPT_DIR%..\remotion-app\public"
set "AUTO_EDITOR_OUTPUT=%OUTPUT_DIR%\stage1_cut.mp4"
set "WHISPER_SRT=%OUTPUT_DIR%\stage1_cut.srt"
set "PLAN_TMP=%OUTPUT_DIR%\plan.json"
set "PLAN_MAPPING=%SCRIPT_DIR%plan\mapping.json"

if not exist "%SOURCE_VIDEO%" (
  echo [ERROR] Khong tim thay video dau vao: %SOURCE_VIDEO%
  exit /b 1
)

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if not exist "%REMOTION_PUBLIC%" mkdir "%REMOTION_PUBLIC%"

echo [STEP] Auto-Editor: loai bo khoang lang => %AUTO_EDITOR_OUTPUT%
python -m auto_editor "%SOURCE_VIDEO%" -o "%AUTO_EDITOR_OUTPUT%" --edit audio:threshold=0.04 --quiet

echo [STEP] Whisper: tao transcript SRT => %WHISPER_SRT%
python -m whisper "%AUTO_EDITOR_OUTPUT%" --model small --language en --task transcribe --output_format srt --output_dir "%OUTPUT_DIR%"

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

copy /Y "%AUTO_EDITOR_OUTPUT%" "%REMOTION_PUBLIC%\input.mp4" >nul
copy /Y "%PLAN_TMP%" "%REMOTION_PUBLIC%\plan.json" >nul

echo [DONE] Da copy du lieu sang remotion-app\public\
echo        - Video: remotion-app\public\input.mp4
echo        - Plan:  remotion-app\public\plan.json
echo [NEXT] Chay: cd ..\remotion-app ^&^& npm install ^&^& npm run render
pause
