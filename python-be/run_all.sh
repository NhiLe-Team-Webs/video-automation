#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ✅ Default input video nằm trong public/input thay vì python-be/inputs
SOURCE_VIDEO="$SCRIPT_DIR/../public/input/input.mp4"
AUTOEDIT_ENABLED="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --autoedit)
      shift
      if [[ $# -eq 0 ]]; then
        echo "[ERROR] --autoedit requires a value (true/false)" >&2
        exit 1
      fi
      AUTOEDIT_ENABLED="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
      ;;
    --autoedit=*)
      AUTOEDIT_ENABLED="$(echo "${1#--autoedit=}" | tr '[:upper:]' '[:lower:]')"
      ;;
    *)
      SOURCE_VIDEO="$1"
      ;;
  esac
  shift
done

if [[ "$AUTOEDIT_ENABLED" != "true" && "$AUTOEDIT_ENABLED" != "false" ]]; then
  echo "[ERROR] --autoedit expects true or false, got '$AUTOEDIT_ENABLED'" >&2
  exit 1
fi

OUTPUT_DIR="$SCRIPT_DIR/outputs"
PUBLIC_ROOT="$SCRIPT_DIR/../public"
PUBLIC_INPUT="$PUBLIC_ROOT/input"
AUTO_EDITOR_OUTPUT="$OUTPUT_DIR/stage1_cut.mp4"
WHISPER_SRT="$OUTPUT_DIR/stage1_cut.srt"
PLAN_TMP="$OUTPUT_DIR/plan.json"
PLAN_MAPPING="$SCRIPT_DIR/plan/mapping.json"

if [ ! -f "$SOURCE_VIDEO" ]; then
  echo "[ERROR] Không tìm thấy video đầu vào: $SOURCE_VIDEO" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR" "$PUBLIC_INPUT"

# Read Auto-Editor configuration values (with defaults)
CONFIG_FILE="$SCRIPT_DIR/../config/video_editing.json"
CONFIG_SCRIPT="$SCRIPT_DIR/scripts/read_autoedit_config.py"
IFS='|' read -r AUTOEDITOR_THRESHOLD AUTOEDITOR_MARGIN AUTOEDITOR_SILENT_SPEED AUTOEDITOR_VIDEO_SPEED < <(
  python "$CONFIG_SCRIPT" "$CONFIG_FILE"
)
AUTOEDITOR_THRESHOLD=${AUTOEDITOR_THRESHOLD:-0.06}
AUTOEDITOR_MARGIN=${AUTOEDITOR_MARGIN:-0.75s,1s}
AUTOEDITOR_SILENT_SPEED=${AUTOEDITOR_SILENT_SPEED:-4}
AUTOEDITOR_VIDEO_SPEED=${AUTOEDITOR_VIDEO_SPEED:-1}

SOURCE_FOR_TRANSCRIPTION="$SOURCE_VIDEO"
if [[ "$AUTOEDIT_ENABLED" != "false" ]]; then
  echo "🎬 Auto-Editor trimming with smooth-pace preset…"

  if ! python - <<'PY'
try:
    import auto_editor  # noqa: F401
except ModuleNotFoundError:
    raise SystemExit(1)
PY
  then
    echo "[INFO] Auto-Editor not found. Installing..."
    if ! python -m pip install --quiet auto-editor; then
      echo "[WARN] Failed to install Auto-Editor. Skipping trimming." >&2
      AUTOEDIT_ENABLED="false"
    fi
  fi

  if [[ "$AUTOEDIT_ENABLED" != "false" ]]; then
    if AUTO_EDITOR_LOG=$(python -m auto_editor "$SOURCE_VIDEO" \
      --output "$AUTO_EDITOR_OUTPUT" \
      --edit "audio:threshold=$AUTOEDITOR_THRESHOLD" \
      --margin "$AUTOEDITOR_MARGIN" \
      --silent-speed "$AUTOEDITOR_SILENT_SPEED" \
      --video-speed "$AUTOEDITOR_VIDEO_SPEED" 2>&1); then
      printf '%s\n' "$AUTO_EDITOR_LOG"
      SOURCE_FOR_TRANSCRIPTION="$AUTO_EDITOR_OUTPUT"
    else
      printf '%s\n' "$AUTO_EDITOR_LOG" >&2
      echo "[WARN] Auto-Editor trimming failed. Using original video." >&2
      SOURCE_FOR_TRANSCRIPTION="$SOURCE_VIDEO"
    fi
  fi
else
  echo "[INFO] Auto-Editor trimming skipped via flag." >&2
fi

echo "[STEP] Whisper: tạo transcript SRT => $WHISPER_SRT"
python -m whisper "$SOURCE_FOR_TRANSCRIPTION" \
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

# ✅ Copy kết quả ngược lại public/input để Remotion đọc
FINAL_VIDEO_PATH="$SOURCE_FOR_TRANSCRIPTION"
if [[ "$FINAL_VIDEO_PATH" != "$AUTO_EDITOR_OUTPUT" ]]; then
  FINAL_VIDEO_PATH="$SOURCE_VIDEO"
  cp "$SOURCE_VIDEO" "$AUTO_EDITOR_OUTPUT"
fi

cp "$FINAL_VIDEO_PATH" "$PUBLIC_INPUT/input.mp4"
cp "$PLAN_TMP" "$PUBLIC_INPUT/plan.json"

echo "[DONE] Đã copy dữ liệu sang public/input/"
echo "       - Video: public/input/input.mp4"
echo "       - Plan:  public/input/plan.json"
echo "[NEXT] Chạy: cd ../remotion-app && npm install && npm run render"
