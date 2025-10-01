#!/bin/bash
set -e

# 1) First cut - cat im lang
python -m auto_editor inputs/1.mp4 -o outputs/stage1_cut.mp4 --edit audio:threshold=0.04 --quiet

# 2) Transcript - tieng Anh
python -m whisper outputs/stage1_cut.mp4 --model small --language en --task transcribe --output_format srt --output_dir outputs

# 3) Sinh plan tu transcript (thu Gemini truoc)
echo "[INFO] Attempting Gemini planning..."
if python scripts/make_plan_gemini.py   outputs/stage1_cut.srt   outputs/plan.json; then
  echo "[INFO] Gemini plan generated successfully."
else
  echo "[WARN] Gemini planner unavailable, falling back to mapping.json"
  python scripts/make_plan_from_srt.py     outputs/stage1_cut.srt     plan/mapping.json     outputs/plan.json
fi

# 4) Apply plan (thay NONE bang duong dan logo neu co)
python scripts/apply_plan_moviepy.py outputs/stage1_cut.mp4 outputs/plan.json NONE outputs/final.mp4

echo "Done! Video xuat ra tai outputs/final.mp4"
