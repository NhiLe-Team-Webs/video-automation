# 🎬 NLT Video Automation

> Transform raw videos into polished content with automated editing, subtitles, and effects in just one command.

[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-required-red.svg)](https://ffmpeg.org/)

---

## ✨ Overview

**NLT Video Automation** is an open-source toolkit that streamlines video editing by combining powerful tools:
- **Auto-Editor** - Removes silence automatically
- **Whisper** - Generates accurate subtitles
- **MoviePy** - Applies effects based on intelligent editing plans

### 🔄 Automation Workflow

```mermaid
graph LR
    A[Raw Video] --> B[Trim Silence]
    B --> C[Generate Subtitles]
    C --> D[Create Editing Plan]
    D --> E[Apply Effects]
    E --> F[Final Video]
```

1. **Trim** - Remove silence from original video
2. **Transcribe** - Generate transcript and `.srt` subtitle file
3. **Plan** - Create `plan.json` from transcript and `mapping.json`
4. **Apply** - Add effects, b-roll, SFX, logo to produce final video

---

## 🚀 Key Features

- ⚡ **One-Command Pipeline** - Run entire workflow or individual steps
- 🎨 **Flexible Customization** - Configure SFX, b-roll, zoom, transitions via `mapping.json`
- 📝 **Subtitle Export** - Generate professional subtitles automatically
- 🎯 **Keyword-Based Effects** - Smart effects triggered by transcript keywords
- 🔧 **Manual Override** - Export plans for fine-tuned manual editing

---

## 📁 Folder Structure

```
video-automation/
├── 📂 assets/
│   ├── broll/          # B-roll footage
│   ├── brand/          # Logos, intro/outro
│   ├── sfx/            # Sound effects
│   └── transition/     # Transition clips
├── 📂 inputs/          # Raw video files (e.g., 1.mp4)
├── 📂 outputs/         # Processed videos & intermediate files
├── 📂 plan/            # Configuration & editing plans
├── 📂 scripts/         # Python automation scripts
├── 📜 run_all.bat      # Windows full pipeline
├── 📜 run_all.sh       # macOS/Linux full pipeline
├── 📜 requirements.txt # Python dependencies
└── 📜 README.md
```

---

## 💻 System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10/11, macOS, or Linux |
| **Python** | 3.11 or higher ([Download](https://www.python.org/downloads/)) |
| **FFmpeg** | Latest version ([Download](https://ffmpeg.org/download.html)) |
| **Disk Space** | 2GB+ recommended |

### Python Packages
- Auto-Editor
- OpenAI Whisper
- MoviePy
- PyDub

---

## 🛠️ Installation

### 1️⃣ Download Source Code

```bash
git clone https://github.com/<your-org>/video-automation.git
cd video-automation
```

Or download ZIP from GitHub and extract.

### 2️⃣ Create Virtual Environment (Recommended)

```bash
# Create environment
python -m venv .venv

# Activate on Windows
.venv\Scripts\activate

# Activate on macOS/Linux
source .venv/bin/activate
```

### 3️⃣ Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Optional: Configure Gemini API Key

1. Copy `.env.example` to `.env`.
2. Add `GEMINI_API_KEY=your_key` inside `.env`.
3. Optionally set `GEMINI_MODEL` to choose a different Gemini model.

> This enables the experimental LLM planner (`scripts/make_plan_gemini.py`).

### 4️⃣ Install FFmpeg

<details>
<summary><b>Windows</b></summary>

1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to system PATH
4. Verify: `ffmpeg -version`
</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install ffmpeg
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
sudo apt update
sudo apt install ffmpeg
```
</details>

### 5️⃣ Verify Installation

```bash
python --version
pip list | grep auto-editor
ffmpeg -version
```

---

## 📦 Prepare Input Data

### Video Files
Place raw videos in `inputs/` folder:
```
inputs/
└── 1.mp4
```

### Assets Organization

```
assets/
├── sfx/              # applause.mp3, ding.mp3, notification.mp3
├── broll/            # office.mp4, typing.mp4
├── transition/       # fade.mov
└── brand/            # logo.png, intro.mp4
```

### Configure Mapping

Edit `plan/mapping.json` to describe how the script cleans filler words, merges clips, and injects creative beats. Key sections:

* `filler_detection` – phrases to trim plus ratio & minimum-duration thresholds.
* `segmenting` – silence merge gap and fallback minimum duration.
* `defaults` – baseline cooldowns and zoom scale for rules that omit explicit values.
* `audio` – high/low pass or other ffmpeg-friendly filters.
* `transitions.rules` – optional conditional transitions with gap windows, keyword scopes, and offsets.
* `actions.sfx` / `actions.zoom` – rich matching logic using `match_type` (`contains`, `token`, `regex`, etc.) and `scope` (`entry`, `segment`, `either`, `both`).

Example:

```json
{
  "filler_detection": {
    "phrases": ["um", "uh", "like", "you know"],
    "ratio_threshold": 0.55,
    "min_duration": 1.0
  },
  "actions": {
    "sfx": [
      {
        "name": "question ping",
        "asset": "sfx/ding.mp3",
        "match_type": "regex",
        "scope": "segment",
        "keywords": {"any": ["\\b(what|why|how|when)\\b"]},
        "offset": 0.05
      }
    ],
    "zoom": [
      {
        "name": "key insight",
        "keywords": {"any": ["important", "key point"]},
        "min_duration": 2.0,
        "scale": 1.2
      }
    ]
  }
}
```

Add additional rules to taste—each rule can set custom cooldowns, offsets, scopes, and `keywords.none` exclusions to fine-tune pro-level timing.

---

## ▶️ Run the Pipeline

### 🎯 Quick Start (Full Automation)

**Windows:**
```powershell
.\run_all.bat
```

**macOS/Linux:**
```bash
chmod +x run_all.sh
./run_all.sh
```

> Tip: If your source video uses AV1 (or any slower-to-decode codec), transcode to H.264 first for much faster auto-editor processing: `ffmpeg -i inputs/1.mp4 -c:v libx264 -preset fast -crf 20 -c:a copy inputs/1_h264.mp4`.

> Default: script tries `make_plan_gemini.py` first; on missing Gemini key or API error it falls back to `make_plan_from_srt.py` with `plan/mapping.json`.

---

### 🔧 Step-by-Step Execution

#### Step 1: Trim Silence
```bash
python -m auto_editor inputs/1.mp4 \
  -o outputs/stage1_cut.mp4 \
  --edit audio:threshold=0.04 \
  --quiet
```

#### Step 2: Generate Subtitles
```bash
python -m whisper outputs/stage1_cut.mp4 \
  --model small \
  --language en \
  --task transcribe \
  --output_format srt \
  --output_dir outputs
```

#### Step 3: Create Editing Plan
```bash
python scripts/make_plan_from_srt.py \
  outputs/stage1_cut.srt \
  plan/mapping.json \
  outputs/plan.json
```

> **LLM option:** `python scripts/make_plan_gemini.py outputs/stage1_cut.srt outputs/plan_gemini.json`

#### Step 4: Apply Effects
```bash
python scripts/apply_plan_moviepy.py \
  outputs/stage1_cut.mp4 \
  outputs/plan.json \
  NONE \
  outputs/final.mp4
```

> **💡 Tip:** Replace `NONE` with logo path (e.g., `assets/brand/logo.png`) to add branding.

---

## 📤 Expected Output

| File | Description |
|------|-------------|
| `outputs/stage1_cut.mp4` | Video with silence removed |
| `outputs/stage1_cut.srt` | Auto-generated subtitles |
| `outputs/plan.json` | Editing plan with effects metadata |
| `outputs/final.mp4` | Final processed video |

---

## 🎨 Advanced Customization

### Add Sound Effects
1. Place audio file in `assets/sfx/`
2. Update `mapping.json`:
```json
"keywords_to_sfx": {
  "wow": "sfx/wow.mp3"
}
```

### Add B-Roll Footage
1. Place video in `assets/broll/`
2. Define keywords:
```json
"keywords_to_broll": {
  "computer": "broll/computer_screen.mp4"
}
```

### Adjust Zoom Triggers
```json
"keywords_to_zoom": ["important", "critical", "attention"]
```

### Change Default Transition
```json
"default_transition": "transition/swipe.mov"
```

### Disable Logo
Pass `NONE` in Step 4 or leave blank.

---

## 🐛 Troubleshooting

### `python` or `pip` not recognized
- **Solution:** Ensure Python is in system PATH
- Verify with `python --version`

### FFmpeg errors
- **Check installation:** `ffmpeg -version`
- **Reinstall:** Follow installation steps above

### Module not found errors
```bash
pip install -r requirements.txt --force-reinstall
```

### Whisper model download fails
- Check internet connection
- Models download automatically on first run
- Default model: `small` (faster, less accurate)
- For better accuracy: change to `medium` or `large`

### Permission errors on Linux/macOS
```bash
chmod +x run_all.sh
chmod +x scripts/*.py
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

Built with:
- [Auto-Editor](https://github.com/WyattBlue/auto-editor)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [MoviePy](https://github.com/Zulko/moviepy)

---

## 📧 Support

Having issues? [Open an issue](https://github.com/<your-org>/video-automation/issues) on GitHub.

---

<div align="center">
  <b>Made with ❤️ by NLT</b>
  <br>
  ⭐ Star this repo if you find it helpful!
</div>
