#!/bin/bash
set -e

# 1) First cut - cắt im lặng
python -m auto_editor inputs/1.mp4 -o outputs/stage1_cut.mp4 --edit audio:threshold=0.04 --quiet

# 2) Transcript - tiếng Anh
python -m whisper outputs/stage1_cut.mp4 --model small --language en --task transcribe --output_format srt --output_dir outputs

# 3) Sinh plan từ transcript
python scripts/make_plan_from_srt.py outputs/stage1_cut.srt plan/mapping.json outputs/plan.json

# 4) Apply plan (không logo)
python scripts/apply_plan_moviepy.py outputs/stage1_cut.mp4 outputs/plan.json NONE outputs/final.mp4

echo "✅ Done! Video xuất ra tại outputs/final.mp4"
