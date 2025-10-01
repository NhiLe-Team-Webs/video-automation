import json
import os
import subprocess
import sys
from pathlib import Path
import time

from moviepy import (
    AudioFileClip,
    ColorClip,
    CompositeAudioClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)
from moviepy.config import FFMPEG_BINARY

try:
    from moviepy import TextClip  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover - optional dependency
    try:
        from moviepy.editor import TextClip  # type: ignore
    except ImportError:  # pragma: no cover - fallback
        TextClip = None

EPSILON = 1e-3
MAX_ZOOM_ACTIONS = 6
MIN_ZOOM_GAP = 8.0

CAPTION_STYLES = {
    "highlight-yellow": {
        "font": "Arial-Bold",
        "fontsize": 58,
        "color": "#1a1a1a",
        "bg_color": "#fde74c",
        "padding": (48, 28),
        "position": ("center", "bottom"),
        "opacity": 0.92,
        "width_ratio": 0.8,
    },
    "center-pop": {
        "font": "Arial-Bold",
        "fontsize": 62,
        "color": "white",
        "bg_color": "#1f1f1f",
        "padding": (56, 36),
        "position": ("center", "center"),
        "opacity": 0.88,
        "width_ratio": 0.65,
    },
    "lower-third": {
        "font": "Arial",
        "fontsize": 46,
        "color": "white",
        "bg_color": "#0f0f0fcc",
        "padding": (38, 20),
        "position": ("center", "bottom"),
        "opacity": 0.95,
        "width_ratio": 0.85,
    },
}
DEFAULT_CAPTION_STYLE = CAPTION_STYLES["highlight-yellow"]

TRANSITION_STYLE_PRESETS = {
    "flash-white": {"color": (255, 255, 255), "opacity": 0.85},
    "dip-to-black": {"color": (0, 0, 0), "opacity": 1.0},
    "spotlight-rise": {"color": (0, 0, 0), "opacity": 0.75},
}


def clamp_time(value: float, duration: float) -> float:
    if duration <= 0:
        return 0.0
    return max(0.0, min(float(value), duration))


def clamp_interval(start: float, end: float, duration: float) -> tuple[float, float]:
    start_clamped = clamp_time(start, duration)
    end_clamped = clamp_time(end, duration)
    if end_clamped < start_clamped:
        end_clamped = start_clamped
    return start_clamped, end_clamped


def resolve_asset_path(asset: str | None, subdir: str) -> str | None:
    if not asset:
        return None
    if os.path.exists(asset):
        return asset
    if asset.startswith("assets/"):
        return asset
    candidate = os.path.join("assets", subdir, asset)
    if os.path.exists(candidate):
        return candidate
    return candidate


def safe_close_clip(clip):
    close = getattr(clip, "close", None)
    if callable(close):
        try:
            close()
        except Exception:
            pass



def make_caption_clip(text: str, start_time: float, duration: float, style_name: str, base_width: int):
    if TextClip is None:
        print('[SKIP] Caption requires MoviePy TextClip support (ImageMagick).')
        return None
    style = CAPTION_STYLES.get(style_name, DEFAULT_CAPTION_STYLE)
    width_ratio = style.get("width_ratio", 0.75)
    width = int(base_width * width_ratio)
    width = max(320, min(base_width, width))

    margin_x, margin_y = style.get("padding", (42, 24))
    margin_kwargs = {
        "left": margin_x,
        "right": margin_x,
        "top": margin_y,
        "bottom": margin_y,
    }
    if style.get("bg_color"):
        margin_kwargs["color"] = style["bg_color"]

    textclip_kwargs = {
        'fontsize': style.get('fontsize', 56),
        'color': style.get('color', 'white'),
        'method': 'caption',
        'size': (width, None),
    }
    font_name = style.get('font')
    if font_name:
        textclip_kwargs['font'] = font_name

    textclip_kwargs.pop('txt', None)

    try:
        clip = TextClip(text, **textclip_kwargs)
    except TypeError as exc:
        if 'font' in str(exc).lower() and 'font' in textclip_kwargs:
            textclip_kwargs.pop('font')
            try:
                clip = TextClip(text, **textclip_kwargs)
            except Exception as retry_exc:  # pragma: no cover - runtime dependency
                print(f"[SKIP] Caption render failed: {retry_exc}")
                return None
        elif 'txt' in str(exc).lower():
            textclip_kwargs.pop('txt', None)
            try:
                clip = TextClip(text, **textclip_kwargs)
            except Exception as retry_exc:  # pragma: no cover - runtime dependency
                print(f"[SKIP] Caption render failed: {retry_exc}")
                return None
        else:
            print(f"[SKIP] Caption render failed: {exc}")
            return None
    except Exception as exc:  # pragma: no cover - runtime dependency
        print(f"[SKIP] Caption render failed: {exc}")
        return None

    clip = clip.margin(**margin_kwargs)
    clip = (
        clip.with_start(start_time)
        .with_duration(duration)
        .with_position(style.get("position", ("center", "bottom")))
        .with_opacity(style.get("opacity", 0.9))
    )
    return clip


if len(sys.argv) < 5:
    print('Usage: python apply_plan_moviepy.py <input_video> <plan.json> <logo_path or NONE> <output_video>')
    sys.exit(1)

input_video, plan_file, logo_path, output_file = sys.argv[1:5]

print(f'[INFO] Loading video: {input_video}')
source_clip = VideoFileClip(input_video)
source_duration = float(source_clip.duration or 0.0)

with open(plan_file, 'r', encoding='utf-8') as handle:
    plan = json.load(handle)

segments = plan.get('segments', [])

if segments:
    print(f'[INFO] Detected {len(segments)} planned segments; trimming source clip.')
    subclips = []
    for idx, segment in enumerate(segments, start=1):
        raw_start = float(segment['start'])
        raw_end = float(segment['end'])
        start = clamp_time(raw_start, source_duration)
        end = clamp_time(raw_end, source_duration)
        if end - start <= EPSILON:
            print(f"  - [SKIP] Segment {idx} invalid after clamping ({raw_start:.3f}s -> {raw_end:.3f}s)")
            continue
        print(f'  - Segment {idx}: {start:.3f}s to {end:.3f}s')
        subclips.append(source_clip.subclipped(start, end))
    base_clip = concatenate_videoclips(subclips, method='compose') if subclips else source_clip
else:
    print('[WARN] Plan provided no segments; using full source clip.')
    base_clip = source_clip


timeline_duration = float(base_clip.duration or 0.0)
layers_v = [base_clip]
layers_a = [base_clip.audio] if base_clip.audio else []

if logo_path != 'NONE' and os.path.exists(logo_path):
    print(f'[LOGO] Adding logo: {logo_path}')
    logo_clip = (
        ImageClip(logo_path)
        .resized(width=int(base_clip.w * 0.15))
        .with_position(('right', 'top'))
        .with_duration(base_clip.duration)
    )
    layers_v.append(logo_clip)

last_zoom_time = -1e9
zoom_count = 0
last_sfx_time: dict[str, float] = {}

for action in plan.get('actions', []):
    if not isinstance(action, dict):
        continue
    action_type = (action.get('type') or '').lower()

    if action_type == 'sfx':
        asset = resolve_asset_path(action.get('asset') or action.get('name'), 'sfx')
        if not asset or not os.path.exists(asset):
            print(f"[SKIP] Missing SFX asset: {action.get('asset') or action.get('name')}")
            continue
        raw_start = float(action.get('time', action.get('start', 0.0)))
        if raw_start >= timeline_duration and timeline_duration > 0:
            print(f'[SKIP] SFX {asset} at {raw_start:.3f}s beyond timeline ({timeline_duration:.3f}s)')
            continue
        start_time = clamp_time(raw_start, timeline_duration)
        cooldown_key = action.get('group') or Path(asset).stem
        if start_time - last_sfx_time.get(cooldown_key, -1e9) < 0.5:
            continue
        print(f'[SFX] {asset} at {start_time:.3f}s')
        layers_a.append(AudioFileClip(asset).with_start(start_time))
        last_sfx_time[cooldown_key] = start_time

    elif action_type == 'zoom':
        raw_start = float(action.get('start', action.get('time', 0.0)))
        raw_end = float(action.get('end', raw_start))
        if raw_end <= raw_start:
            continue
        start_time, end_time = clamp_interval(raw_start, raw_end, timeline_duration)
        if end_time - start_time <= EPSILON:
            print(f"[SKIP] Zoom outside timeline ({raw_start:.3f}s -> {raw_end:.3f}s)")
            continue
        if zoom_count >= MAX_ZOOM_ACTIONS or start_time - last_zoom_time < MIN_ZOOM_GAP:
            print(f"[SKIP] Zoom limit reached or too close to previous (start {start_time:.3f}s)")
            continue
        scale = float(action.get('scale', 1.1))
        scale = max(1.05, min(1.25, scale))
        print(f'[ZOOM] {scale:.2f}x from {start_time:.3f}s to {end_time:.3f}s')
        zoom_layer = (
            base_clip.subclipped(start_time, end_time)
            .resized(scale)
            .with_start(start_time)
        )
        layers_v.append(zoom_layer)
        last_zoom_time = start_time
        zoom_count += 1

    elif action_type == 'transition':
        raw_start = float(action.get('time', action.get('start', 0.0)))
        raw_duration = float(action.get('duration', action.get('length', 0.5)))
        if raw_duration <= 0:
            raw_duration = 0.5
        start_time = clamp_time(raw_start, timeline_duration)
        available = max(0.0, timeline_duration - start_time)
        if available <= EPSILON:
            print('[SKIP] Transition has no room on timeline')
            continue
        duration = min(raw_duration, available)
        asset = resolve_asset_path(action.get('asset'), 'transition')
        style_name = (action.get('style') or '').lower()
        if asset and os.path.exists(asset):
            print(f'[TRANSITION] {asset} at {start_time:.3f}s for {duration:.3f}s')
            transition_clip = (
                VideoFileClip(asset)
                .with_start(start_time)
                .resized(width=base_clip.w)
                .with_duration(duration)
            )
            layers_v.append(transition_clip)
        else:
            preset = TRANSITION_STYLE_PRESETS.get(style_name)
            if not preset:
                print(f"[SKIP] Transition asset/style unavailable ({asset or style_name})")
                continue
            print(f'[TRANSITION] {style_name} overlay at {start_time:.3f}s for {duration:.3f}s')
            overlay = (
                ColorClip(size=(base_clip.w, base_clip.h), color=preset.get('color', (255, 255, 255)))
                .with_start(start_time)
                .with_duration(duration)
                .with_opacity(preset.get('opacity', 0.7))
            )
            layers_v.append(overlay)

    elif action_type == 'caption':
        text = (action.get('text') or '').strip()
        if not text:
            continue
        raw_start = float(action.get('time', action.get('start', 0.0)))
        raw_duration = float(action.get('duration', action.get('end', 0.0)))
        if raw_duration <= 0:
            raw_duration = 2.5
        start_time = clamp_time(raw_start, timeline_duration)
        available = max(0.0, timeline_duration - start_time)
        if available <= EPSILON:
            continue
        duration = min(raw_duration, available)
        style_name = (action.get('style') or '').lower() or 'highlight-yellow'
        caption_clip = make_caption_clip(text, start_time, duration, style_name, base_clip.w)
        if caption_clip is not None:
            layers_v.append(caption_clip)

composite = CompositeVideoClip(layers_v, size=(base_clip.w, base_clip.h))

if layers_a:
    composite = composite.with_audio(CompositeAudioClip(layers_a))

filters_cfg = plan.get('audio', {}).get('filters', {})
audio_filters = []
if filters_cfg:
    highpass = filters_cfg.get('highpass_hz')
    lowpass = filters_cfg.get('lowpass_hz')
    if isinstance(highpass, (int, float)) and highpass > 0:
        audio_filters.append(f'highpass=f={highpass}')
    if isinstance(lowpass, (int, float)) and lowpass > 0:
        audio_filters.append(f'lowpass=f={lowpass}')

needs_audio_filters = bool(audio_filters)
audio_filter_chain = ','.join(audio_filters)

output_path = Path(output_file)
export_path = output_path
if needs_audio_filters:
    export_path = output_path.with_name(output_path.stem + '_pre_filter' + output_path.suffix)
    print(f'[AUDIO] Will apply filters after render: {audio_filter_chain}')

print(f'[EXPORT] Writing final video to: {export_path}')
composite.write_videofile(
    str(export_path),
    fps=base_clip.fps or 30,
    codec='libx264',
    audio_codec='aac',
    audio=True,
)

# release resources before FFmpeg step
seen_ids = set()
for clip in layers_v + [base_clip, composite]:
    clip_id = id(clip)
    if clip_id in seen_ids:
        continue
    seen_ids.add(clip_id)
    safe_close_clip(clip)

seen_ids.clear()
for audio_layer in layers_a:
    clip_id = id(audio_layer)
    if clip_id in seen_ids:
        continue
    seen_ids.add(clip_id)
    safe_close_clip(audio_layer)

safe_close_clip(source_clip)

def remove_with_retry(path: Path, attempts: int = 3, delay: float = 0.3) -> None:
    for attempt in range(attempts):
        try:
            path.unlink()
            return
        except PermissionError:
            if attempt == attempts - 1:
                print(f'[WARN] Could not remove temporary file: {path}')
            else:
                time.sleep(delay)

if needs_audio_filters:
    ffmpeg_cmd = [
        FFMPEG_BINARY,
        '-y',
        '-i',
        str(export_path),
        '-c:v',
        'copy',
        '-af',
        audio_filter_chain,
        str(output_path),
    ]
    print(f'[AUDIO] Post-processing audio with FFmpeg filters: {audio_filter_chain}')
    subprocess.run(ffmpeg_cmd, check=True)
    remove_with_retry(export_path)
    print(f'[AUDIO] Filtered audio written to {output_path}')

print('[DONE] Finished rendering.')
