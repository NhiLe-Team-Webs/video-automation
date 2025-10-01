@echo off
setlocal

REM 1) First cut - cat im lang
python -m auto_editor inputs\1.mp4 -o outputs\stage1_cut.mp4 --edit audio:threshold=0.04 --quiet

REM 2) Transcript - tao phu de (EN)
python -m whisper outputs\stage1_cut.mp4 --model small --language en --task transcribe --output_format srt --output_dir outputs

REM 3) Sinh plan tu transcript (uu tien Gemini neu co)
echo [INFO] Attempting Gemini planning...
python scripts\make_plan_gemini.py outputs\stage1_cut.srt outputs\plan.json
if errorlevel 1 (
  echo [WARN] Gemini planner unavailable, falling back to mapping.json
  python scripts\make_plan_from_srt.py outputs\stage1_cut.srt plan\mapping.json outputs\plan.json
) else (
  echo [INFO] Gemini plan generated successfully.
)

REM 4) Apply plan (khong can logo)
python scripts\apply_plan_moviepy.py outputs\stage1_cut.mp4 outputs\plan.json NONE outputs\final.mp4

echo Done! Video xuat ra tai outputs\final.mp4
pause
