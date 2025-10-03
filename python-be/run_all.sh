#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

INPUT_DIR="$SCRIPT_DIR/inputs"
DEFAULT_SOURCE_VIDEO="$INPUT_DIR/input.mp4"
SOURCE_VIDEO="${1:-$DEFAULT_SOURCE_VIDEO}"
OUTPUT_DIR="$SCRIPT_DIR/outputs"
PUBLIC_ROOT="$SCRIPT_DIR/../public"
PUBLIC_INPUT="$PUBLIC_ROOT/input"
AUTO_EDITOR_OUTPUT="$OUTPUT_DIR/stage1_cut.mp4"
WHISPER_SRT="$OUTPUT_DIR/stage1_cut.srt"
PLAN_TMP="$OUTPUT_DIR/plan.json"
PLAN_MAPPING="$SCRIPT_DIR/plan/mapping.json"

mkdir -p "$INPUT_DIR"

if [ ! -f "$SOURCE_VIDEO" ]; then
  echo "[ERROR] Không tìm thấy video đầu vào: $SOURCE_VIDEO" >&2
  echo "        - Đặt video nguồn tại: $INPUT_DIR/input.mp4" >&2
  echo "        - Hoặc chạy: ./run_all.sh đường/dẫn/tới/video.mp4" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR" "$PUBLIC_INPUT"

echo "[STEP] Auto-Editor: loại bỏ khoảng lặng => $AUTO_EDITOR_OUTPUT"
python -m auto_editor "$SOURCE_VIDEO" -o "$AUTO_EDITOR_OUTPUT" \
  --edit audio:threshold=0.04 \
  --video-codec libx264 \
  --audio-codec aac \
  --quiet

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

cp "$AUTO_EDITOR_OUTPUT" "$PUBLIC_INPUT/input.mp4"
cp "$PLAN_TMP" "$PUBLIC_INPUT/plan.json"

echo "[DONE] Đã copy dữ liệu sang public/input/"
echo "       - Video: public/input/input.mp4"
echo "       - Plan:  public/input/plan.json"
echo "[NEXT] Chạy: cd ../remotion-app && npm install && npm run render"
