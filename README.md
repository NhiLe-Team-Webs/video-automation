# Video Automation (Open Source)

## Overview
**dYZ Video Automation** helps you turn raw video into a trimmed version, adding effects with just one command. The toolkit combines Auto-Editor to remove silence, Whisper to create subtitles, and MoviePy to apply effects based on a detailed editing plan.

### Automation workflow
1. Trim silence from the original video.
2. Generate transcript and subtitle file in `.srt` format.
3. Generate editing plan (`plan.json`) from transcript and `mapping.json`.
4. Apply effects, b-roll, SFX, logo to output the finished video.

## Key features
- Automate the entire short video processing pipeline.
- Support running a single command for the entire process or for each individual step.

- Flexible customization via `plan/mapping.json` for SFX, b-roll, zoom, transition.

- Export with subtitles and a plan for manual editing when needed.

## Folder Structure
```
video-automation/
assets/
broll/ # Auxiliary videos (illustrative cuts)
brand/ # Logo, intro/outro
sfx/ # Sound effects
transition/ # Default transition effects
inputs/ # Input video (e.g. 1.mp4)
outputs/ # Output after each step and final video
plan/ # Mapping configuration and plans
scripts/ # Script to create and apply plans with MoviePy
run_all.bat # Full pipeline for Windows
run_all.sh # Full pipeline for macOS/Linux
requirements.txt
```
## System requirements
- Windows 10/11, macOS or Linux.
- Python 3.11 or higher (should be installed from [python.org/downloads](https://www.python.org/downloads/)).

- `pip` comes with Python to install libraries.

- FFmpeg is installed and added to `PATH` (`ffmpeg -version` to check).

- Python packages: Auto-Editor, OpenAI Whisper, MoviePy, PyDub (install with `pip`).

## Installation
1. **Download source code**
```bash
git clone https://github.com/<your-org>/video-automation.git
cd video-automation
```
Or download ZIP from GitHub, extract and open in terminal.

2. **Create a virtual environment (recommended)**
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

3. **Install Python libraries**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

4. **Install FFmpeg**
- Windows: download the build at [ffmpeg.org/download.html](https://ffmpeg.org/download.html), unzip, add the `bin` folder to `PATH`.

- macOS: use `brew install ffmpeg`.

- Linux: use a package manager (e.g. `sudo apt install ffmpeg`).

5. **Verify the installation**
```bash
python --version
pip list | findstr auto-editor
ffmpeg -version
```

## Prepare input data
- Put the original video in `inputs/` and name it in order (e.g. `1.mp4`).
- Organize assets in `assets/`:
- `assets/sfx/`: sound effects, e.g. `applause.mp3`, `ding.mp3`.
- `assets/broll/`: demo videos, e.g. `office.mp4`, `typing.mp4`.
- `assets/transition/`: transition clips, e.g. `fade.mov`.
- `assets/brand/`: logos, intro/outro.
- Adjust `plan/mapping.json` to map keywords to the desired asset file:
```json
{
"keywords_to_remove": ["um", "uh", "like", "you know"],
"keywords_to_sfx": {
"applause": "sfx/applause.mp3",
"notification": "sfx/notification.mp3"
},
"keywords_to_zoom": ["important", "note", "key point"],
"default_transition": "transition/fade.mov"
}
```

## Run the pipeline
### Fastest way
- **Windows**
```powershell
.\run_all.bat
```
- **macOS/Linux**
```bash
chmod +x run_all.sh
./run_all.sh 
```

### Step by step craft
1. Cut silence: 
```bash 
python -m auto_editor inputs/1.mp4 -o outputs/stage1_cut.mp4 --edit audio:threshold=0.04 --quiet 
```
2. Create transcript and English subtitles: 
```bash 
python -m whisper outputs/stage1_cut.mp4 --model small --language en --task transcribe --output_format srt --output_dir outputs 
```
3. Generate plan from transcript: 
```bash 
python scripts/make_plan_from_srt.py outputs/stage1_cut.srt plan/mapping.json outputs/plan.json 
```
4. Apply plan with MoviePy: 
```bash 
python scripts/apply_plan_moviepy.py outputs/stage1_cut.mp4 outputs/plan.json NONE outputs/final.mp4
```
The third parameter (`NONE`) is the logo path. Change to a specific file or keep `NONE` if no logo is inserted.

## Expected output
- `outputs/stage1_cut.mp4`: video with cut silence.

- `outputs/stage1_cut.srt`: automatic subtitles.

- `outputs/plan.json`: editing plan with b-roll, SFX, zoom information.

- `outputs/final.mp4`: final video after effects are applied.

## Advanced customization
- **Add SFX**: add file to `assets/sfx/` then update `keywords_to_sfx`.

- **Add b-roll**: put file in `assets/broll/` and declare corresponding keywords.
- **Zoom Adjustment**: edit the `keywords_to_zoom` list.

- **Change default transition**: point `default_transition` to a new file in `assets/transition/`.

- **Disable logo**: pass `NONE` (or leave blank) in the apply plan step.

## Troubleshooting
- `python` or `pip` doesn't