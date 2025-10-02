# 🎬 Python Backend Toolkit

The scripts inside `python-be/` normalize your source footage, generate transcripts, and create a Remotion-ready `plan.json`. The resulting assets are copied into `remotion-app/public/` so the Remotion project can render automatically.

## 🚀 Quick start workflow

1. **Set up the environment**
   ```bash
   cd python-be
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

2. **Provide the inputs**
   - Source video: `python-be/inputs/input.mp4` (you can pass a different path when running the script).
   - Gemini planning (optional): create a `.env` file with `GEMINI_API_KEY=...` (and optionally `GEMINI_MODEL`).
   - Highlight SFX must exist in `remotion-app/public/sfx/` with the exact relative path (for example `ui/pop.mp3`, `whoosh/whoosh.mp3`).

3. **Run the full pipeline**
   ```bash
   # macOS/Linux
   ./run_all.sh                     # or ./run_all.sh path/to/video.mp4

   :: Windows
   run_all.bat                      # or run_all.bat path\to\video.mp4
   ```

   The script performs the following:
   - Auto-Editor removes silence → `outputs/stage1_cut.mp4`.
   - Whisper generates an SRT transcript → `outputs/stage1_cut.srt`.
   - A planning step produces `plan.json` (Gemini first, static mapping fallback).
   - Copies `stage1_cut.mp4` and `plan.json` into `remotion-app/public/` as `input.mp4` and `plan.json`.

4. **Render with Remotion**
   ```bash
   cd ../remotion-app
   npm install
   npm run render                   # produces out/final.mp4
   ```

## 📄 `plan.json` structure

The generated plan conforms to the Remotion schema (`remotion-app/src/data/planSchema.ts`):

```json
{
  "segments": [
    {
      "id": "segment-01",
      "sourceStart": 0.0,
      "duration": 12.5,
      "label": "Introduction",
      "transitionOut": {"type": "crossfade", "duration": 0.6}
    },
    {
      "id": "segment-02",
      "sourceStart": 14.1,
      "duration": 18.2,
      "transitionIn": {"type": "crossfade", "duration": 0.6},
      "transitionOut": {"type": "slide", "duration": 0.5, "direction": "left"}
    }
  ],
  "highlights": [
    {
      "id": "highlight-01",
      "text": "Key insight: 200% growth",
      "start": 5.8,
      "duration": 2.6,
      "position": "center",
      "animation": "zoom",
      "sfx": "emphasis/ding.mp3"
    }
  ]
}
```

- `sourceStart` and `duration` are measured in seconds relative to the trimmed video (`input.mp4`).
- `transitionIn`/`transitionOut` support the following `type` values: `cut`, `crossfade`, `slide`, `zoom`, `scale`, `rotate`, and `blur`. Slides can include `direction` (`left|right|up|down`); zoom/scale/rotate/blur accept an `intensity` value (≈0.1–0.35).
- Highlights rotate through animations (`fade/zoom/slide/bounce/float/flip`) and choose a position (`center/bottom/top`). If an SFX rule specifies `volume`, the value is preserved (0–1).

## 🤖 Gemini planner (optional)

- `scripts/make_plan_gemini.py` submits the transcript to Gemini and normalizes the response to the schema above.
- Requires the `GEMINI_API_KEY` environment variable (and optional `GEMINI_MODEL`).
- If Gemini fails, the pipeline automatically falls back to `scripts/make_plan_from_srt.py`, which uses `plan/mapping.json`.

### Customize the fallback mapping

- `plan/mapping.json` lets you describe rules for segments, transitions, and SFX.
- Adjust or add rules to influence the fallback output.
- Fallback highlights pull notable transcript sentences and attach SFX according to the matching `sfx` rule.

## 🧪 Intermediate artifacts

| File | Purpose |
|------|---------|
| `outputs/stage1_cut.mp4` | Silence-trimmed video (copied to Remotion). |
| `outputs/stage1_cut.srt` | Whisper transcript. |
| `outputs/plan.json` | Final plan before copying to Remotion. |
| `remotion-app/public/input.mp4` | Video consumed by Remotion. |
| `remotion-app/public/plan.json` | Plan consumed by Remotion during rendering. |

## 🔧 Troubleshooting

- **Missing `stage1_cut.srt`**: confirm Whisper installed correctly (`pip install -r requirements.txt`) and your machine has the required CPU/GPU support.
- **No highlights in the plan**: ensure the SFX rules in `mapping.json` match transcript keywords or add guidance when invoking Gemini.
- **Remotion render fails due to missing SFX**: verify each SFX path in `plan.json` (for example `ui/pop.mp3`) exists in `remotion-app/public/sfx/`.
- **Need to debug the plan**: inspect `outputs/plan.json` before Remotion consumes it.

These scripts align perfectly with the Remotion pipeline—run `run_all`, then render inside `remotion-app` to produce `final.mp4` with synchronized segments, transitions, highlights, and SFX.
