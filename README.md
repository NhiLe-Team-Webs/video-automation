# Video Automation Pipeline

This project stitches together Remotion, MoviePy, Auto-Editor, Whisper, and a generated planning file (`plan.json`) to automate end-to-end video production. The repository contains two coordinated workspaces:

- `python-be/`: Python pipeline that trims the source video, generates transcripts, and produces a `plan.json` tailored for Remotion.
- `remotion-app/`: Remotion project that renders the final video based on the processed assets.

## High-level architecture

1. The Python/AI pipeline analyzes `input.mp4` and generates `plan.json`, which includes segment boundaries, highlight metadata, and animation details.
2. Remotion reads `input.mp4`, `plan.json`, and the `sfx/` directory to assemble the timeline:
   - Split the video into segments.
   - Apply transitions (crossfade/slide, etc.).
   - Render animated text highlights (fade/zoom/slide) in sync with the script.
   - Layer sound effects that correspond to each highlight.
3. Render the final cut (`final.mp4`) with `npx remotion render`.

## Prepare the input data

1. **Recommended: run the Python pipeline**
   ```bash
   cd python-be
   ./run_all.sh                     # or run_all.sh on Windows
   ```
   The script generates `outputs/plan.json`, copies it to `remotion-app/public/plan.json`, and copies the trimmed video to `remotion-app/public/input.mp4`.

2. **Manual data prep**
   If you prefer to supply assets manually, place your video and plan file inside `remotion-app/public/`. The folder includes `plan.sample.json` as a reference:

```json
{
  "segments": [
    {
      "id": "intro",
      "sourceStart": 0,
      "duration": 20,
      "transitionOut": {"type": "crossfade", "duration": 1}
    }
  ],
  "highlights": [
    {
      "id": "hook",
      "text": "Key message appears!",
      "start": 5,
      "duration": 4,
      "position": "center",
      "animation": "zoom",
      "sfx": "ui/pop.mp3"
    }
  ]
}
```

3. Place your sound-effect files in `remotion-app/public/sfx/` (for example, `ui/pop.mp3`). The Python pipeline preserves relative SFX paths when it generates highlights.

> **Note:** Remotion automatically looks for `plan.json` in the `public/` folder. If you want to render from a different location, pass custom props when running the Remotion CLI:
>
> ```bash
> npx remotion render src/Root.tsx FinalVideo out/final.mp4 --props '{"planPath":"custom-plan.json","inputVideo":"input.mp4"}'
> ```

If the final video is longer than 15 minutes, update `DEFAULT_DURATION_IN_FRAMES` in `remotion-app/src/config.ts` to match the new duration.

## Preview and render

```bash
cd remotion-app
npm install
npm start          # Launch Remotion Studio preview
# or
npm run render     # Produce out/final.mp4
```

The exported video is saved to `remotion-app/out/final.mp4`.

## Remotion structure

- `src/types.ts`: Shared types for segments, highlights, and transitions.
- `src/data/planSchema.ts`: Zod schema definition and example plan data.
- `src/hooks/usePlan.ts`: Hook that loads and validates `plan.json`.
- `src/components/VideoTimeline.tsx`: Splits video into segments and handles transitions.
- `src/components/HighlightCallout.tsx` + `HighlightsLayer.tsx`: Animated text overlays.
- `src/components/SfxLayer.tsx`: Synchronizes SFX with highlight timing.
- `src/components/FinalComposition.tsx`: Combines all timeline layers.
- `src/Root.tsx`: Registers the Remotion composition.

## Extend the pipeline

- Connect the Python pipeline to Auto-Editor/MoviePy for automated plan generation.
- Integrate Whisper to generate transcripts and highlight suggestions automatically.
- Add background music by extending `FinalComposition` with an audio layer.
- Use metadata (for example, a `cameraMovement` tag) inside `plan.json` to drive advanced animations.

## Quality checklist

- No black frames appear between segments.
- Transitions are smooth, and highlights appear on time with matching SFX.
- Animations stay concise to match the YouTube-inspired style.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
