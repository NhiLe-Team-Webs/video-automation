#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SOURCE_VIDEO="${1:-inputs/input.mp4}"
OUTPUT_DIR="$SCRIPT_DIR/outputs"
REMOTION_PUBLIC="$SCRIPT_DIR/../remotion-app/public"
AUTO_EDITOR_OUTPUT="$OUTPUT_DIR/stage1_cut.mp4"
WHISPER_SRT="$OUTPUT_DIR/stage1_cut.srt"
PLAN_TMP="$OUTPUT_DIR/plan.json"
PLAN_MAPPING="$SCRIPT_DIR/plan/mapping.json"

if [ ! -f "$SOURCE_VIDEO" ]; then
  echo "[ERROR] Không tìm thấy video đầu vào: $SOURCE_VIDEO" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR" "$REMOTION_PUBLIC"

echo "[STEP] Auto-Editor: loại bỏ khoảng lặng => $AUTO_EDITOR_OUTPUT"
python -m auto_editor "$SOURCE_VIDEO" -o "$AUTO_EDITOR_OUTPUT" --edit audio:threshold=0.04 --quiet

echo "[STEP] Whisper: tạo transcript SRT => $WHISPER_SRT"
python -m whisper "$AUTO_EDITOR_OUTPUT" \
  --model small \
  --language en \
  --task transcribe \
  --output_format srt \
  --output_dir "$OUTPUT_DIR"

if [ ! -f "$WHISPER_SRT" ]; then
  echo "[ERROR] Whisper không tạo được file $WHISPER_SRT" >&2
  exit 1
fi

echo "[STEP] Sinh plan Remotion (ưu tiên Gemini)"
if python scripts/make_plan_gemini.py "$WHISPER_SRT" "$PLAN_TMP"; then
  echo "[INFO] Gemini plan generated successfully."
else
  echo "[WARN] Gemini planner unavailable, fallback mapping.json"
  python scripts/make_plan_from_srt.py "$WHISPER_SRT" "$PLAN_MAPPING" "$PLAN_TMP"
fi

cp "$AUTO_EDITOR_OUTPUT" "$REMOTION_PUBLIC/input.mp4"
cp "$PLAN_TMP" "$REMOTION_PUBLIC/plan.json"

echo "[DONE] Đã copy dữ liệu sang remotion-app/public/"
echo "       - Video: remotion-app/public/input.mp4"
echo "       - Plan:  remotion-app/public/plan.json"
echo "[NEXT] Chạy: cd ../remotion-app && npm install && npm run render"
