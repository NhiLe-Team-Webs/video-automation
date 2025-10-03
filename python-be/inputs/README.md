# Input video placeholder

Place your source footage in this folder and rename it to `input.mp4` before running `run_all.sh` or `run_all.bat`.

You can also pass an absolute or relative path to the scripts:

```bash
./run_all.sh path/to/your/video.mp4
```

```bat
run_all.bat path\to\your\video.mp4
```

The pipeline will create `outputs/` and copy processed assets into `public/input/` automatically.
