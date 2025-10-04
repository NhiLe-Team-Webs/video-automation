# 🎬 Python Backend Toolkit

The scripts inside `python-be/` normalize your source footage, generate transcripts, and create a Remotion-ready `plan.json`. The resulting assets are copied into the shared `public/input/` workspace so the Remotion project can render automatically.

## 🚀 Quick start workflow

1. **Set up the environment**
   ```bash
   cd python-be
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

   Create a `.env` file next to this README if you want to override transition timing. The generator reads the following optional keys (falling back to defaults shown below):

   ```dotenv
   # Minimum silence (in milliseconds) that must follow a segment before a transition is inserted
   TRANSITIONS_MIN_PAUSE_MS=700

   # Fallback if the key above is missing
   TRANSITION_MIN_PAUSE_MS=700

   # Generic override consumed by other tools in the stack
   MIN_PAUSE_MS=700

   # Default transition type when no rule matches (fadeCamera | slideWhoosh | cut)
   DEFAULT_TRANSITION_TYPE=fadeCamera
   ```

2. **Provide the inputs**
   - Source video: `python-be/inputs/input.mp4` (you can pass a different path when running the script).
   - Gemini planning (optional): create a `.env` file with `GEMINI_API_KEY=...` (and optionally `GEMINI_MODEL`).
   - Highlight SFX must exist in `assets/sfx/` with the exact relative path (for example `ui/pop.mp3`, `whoosh/whoosh.mp3`).

3. **Run the full pipeline**
   ```bash
   # macOS/Linux
   ./run_all.sh                     # or ./run_all.sh path/to/video.mp4

   :: Windows
   run_all.bat                      # or run_all.bat path\to\video.mp4
   ```

  The script performs the following:
   - Auto-Editor trims long pauses with a smooth-pace preset → `outputs/stage1_cut.mp4` (configurable via `config/video_editing.json`).
   - Whisper generates an SRT transcript → `outputs/stage1_cut.srt`.
   - A planning step produces `plan.json` (Gemini first, static mapping fallback).
   - Copies `stage1_cut.mp4` (or the original video if trimming is skipped) and `plan.json` into `public/input/` as `input.mp4` and `plan.json`.

   > 💡 Tweak the trimming feel by editing `config/video_editing.json` (`threshold`, `margin`, `silent_speed`, `video_speed`). Use `./run_all.sh --autoedit false` (or `run_all.bat --autoedit=false`) to bypass Auto-Editor when you want the raw take.

4. **Render with Remotion**
   ```bash
   cd ../remotion-app
   npm install                      # installs the Remotion CLI (required for build/render)
   npm run render                   # produces out/final.mp4
   ```

## 📄 `plan.json` structure

The generated plan conforms to the Remotion schema (`remotion-app/src/data/planSchema.ts`):

```json
{
  "segments": [
    {
      "id": "seg-01",
      "kind": "normal",
      "sourceStart": 0.0,
      "duration": 12.5,
      "label": "Introduction",
      "transitionOut": {
        "type": "fadeCamera",
        "duration": 0.8,
        "sfx": "ui/camera.mp3"
      },
      "silenceAfter": true
    },
    {
      "id": "broll1",
      "kind": "broll",
      "title": "AI Robot (download later)",
      "duration": 3.0,
      "transitionIn": {
        "type": "fadeCamera",
        "duration": 0.8,
        "sfx": "ui/camera.mp3"
      },
      "transitionOut": {
        "type": "slideWhoosh",
        "duration": 0.7,
        "direction": "left",
        "sfx": "ui/whoosh.mp3"
      }
    }
  ],
  "highlights": [
    {
      "id": "h1",
      "type": "typewriter",
      "text": "Get recommended by AI",
      "start": 64.2,
      "duration": 3.2,
      "sfx": "ui/type.mp3"
    },
    {
      "id": "h2",
      "type": "noteBox",
      "text": "Make your Google Business Profile shine",
      "start": 86.1,
      "duration": 4.8,
      "side": "bottom"
    },
    {
      "id": "sec2",
      "type": "sectionTitle",
      "title": "Strategy #2",
      "start": 210.0,
      "duration": 3.5,
      "variant": "black"
    },
    {
      "id": "icon1",
      "type": "icon",
      "name": "Rocket",
      "start": 123.4,
      "duration": 1.2,
      "sfx": "ui/pop.mp3"
    }
  ],
  "metadata": {
    "min_pause_seconds": 0.7
  }
}
```

- `sourceStart` and `duration` are measured in seconds relative to the trimmed video (`input.mp4`).
- `kind` distinguishes regular camera segments from `broll` placeholders so the Remotion project can render the correct component.
- `transitionIn`/`transitionOut` now focus on the union `cut | fadeCamera | slideWhoosh`. Silence-aware transitions are only emitted when the gap after a segment meets `min_pause_seconds`.
- Highlights map directly to the Remotion variants:
  - `typewriter`: type-on headline with a blinking caret.
  - `noteBox`: branded slide-in note card with per-character typing SFX.
  - `sectionTitle`: full-screen cutaway for chapter titles (supports optional `subtitle`/`badge`).
  - `icon`: renders Lucide-driven iconography with a pop + float animation.

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
| `public/input/input.mp4` | Video consumed by Remotion. |
| `public/input/plan.json` | Plan consumed by Remotion during rendering. |

## 🔧 Troubleshooting

- **Missing `stage1_cut.srt`**: confirm Whisper installed correctly (`pip install -r requirements.txt`) and your machine has the required CPU/GPU support.
- **No highlights in the plan**: ensure the SFX rules in `mapping.json` match transcript keywords or add guidance when invoking Gemini.
- **Remotion render fails due to missing SFX**: verify each SFX path in `plan.json` (for example `ui/pop.mp3`) exists in the shared `assets/sfx/` directory.
- **Transitions feel abrupt**: raise `TRANSITIONS_MIN_PAUSE_MS` in `.env` to require longer silences before adding effects, or set `DEFAULT_TRANSITION_TYPE=cut` to disable fades/slides.
- **Need to debug the plan**: inspect `outputs/plan.json` before Remotion consumes it.

These scripts align perfectly with the Remotion pipeline—run `run_all`, then render inside `remotion-app` to produce `final.mp4` with synchronized segments, transitions, highlights, and SFX.
