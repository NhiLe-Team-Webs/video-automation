#!/bin/bash
set -e

# 1) First cut
auto-editor inputs/main.mp4 -o outputs/stage1_cut.mp4 --silent-threshold 0.04 --quiet

# 2) Transcript
python3 -m whisper outputs/stage1_cut.mp4 --model small --language vi --task transcribe --output_format srt --output_dir outputs

# 3) Sinh plan
python3 scripts/make_plan_from_srt.py outputs/stage1_cut.srt plan/mapping.json outputs/plan.json

# 4) Apply plan
python3 scripts/apply_plan_moviepy.py outputs/stage1_cut.mp4 outputs/plan.json assets/brand/logo.png outputs/final.mp4

echo "✅ Done! Video xuất ra tại outputs/final.mp4"
