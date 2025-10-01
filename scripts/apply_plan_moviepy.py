import json
import os
import subprocess
import sys
from pathlib import Path

from moviepy import (
    AudioFileClip,
    CompositeAudioClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)
from moviepy.config import FFMPEG_BINARY
EPSILON = 1e-3

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

for action in plan.get('actions', []):
    action_type = action.get('type')

    if action_type == 'sfx':
        asset = action.get('asset')
        if not asset:
            continue
        if not os.path.exists(asset):
            alt_asset = os.path.join('assets', asset)
            if os.path.exists(alt_asset):
                asset = alt_asset
        if not os.path.exists(asset):
            print(f'[SKIP] Missing SFX asset: {action.get("asset")}')
            continue
        raw_start = float(action.get('time', 0.0))
        if raw_start >= timeline_duration and timeline_duration > 0:
            print(f'[SKIP] SFX {asset} at {raw_start:.3f}s beyond timeline ({timeline_duration:.3f}s)')
            continue
        start_time = clamp_time(raw_start, timeline_duration)
        print(f'[SFX] {asset} at {start_time:.3f}s')
        layers_a.append(AudioFileClip(asset).with_start(start_time))

    elif action_type == 'zoom':
        raw_start = float(action.get('start', 0.0))
        raw_end = float(action.get('end', raw_start))
        if raw_end <= raw_start:
            continue
        start_time, end_time = clamp_interval(raw_start, raw_end, timeline_duration)
        if end_time - start_time <= EPSILON:
            print(f"[SKIP] Zoom outside timeline ({raw_start:.3f}s -> {raw_end:.3f}s)")
            continue
        scale = float(action.get('scale', 1.1))
        print(f'[ZOOM] {scale:.2f}x from {start_time:.3f}s to {end_time:.3f}s')
        zoom_layer = (
            base_clip.subclipped(start_time, end_time)
            .resized(scale)
            .with_start(start_time)
        )
        layers_v.append(zoom_layer)

    elif action_type == 'transition':
        asset = action.get('asset')
        if not asset:
            continue
        if not os.path.exists(asset):
            alt_asset = os.path.join('assets', asset)
            if os.path.exists(alt_asset):
                asset = alt_asset
        if not os.path.exists(asset):
            print(f'[SKIP] Missing transition asset: {action.get("asset")}')
            continue
        raw_start = float(action.get('time', 0.0))
        raw_duration = float(action.get('duration', 0.5))
        if raw_start >= timeline_duration and timeline_duration > 0:
            print(f"[SKIP] Transition start {raw_start:.3f}s beyond timeline ({timeline_duration:.3f}s)")
            continue
        start_time = clamp_time(raw_start, timeline_duration)
        available = max(0.0, timeline_duration - start_time)
        if available <= EPSILON:
            print(f"[SKIP] Transition {asset} has no room on timeline")
            continue
        duration = min(raw_duration, available) if raw_duration > 0 else available
        print(f'[TRANSITION] {asset} at {start_time:.3f}s for {duration:.3f}s')
        transition_clip = (
            VideoFileClip(asset)
            .with_start(start_time)
            .resized(width=base_clip.w)
            .with_duration(duration)
        )
        layers_v.append(transition_clip)

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
    os.remove(export_path)
    print(f'[AUDIO] Filtered audio written to {output_path}')

print('[DONE] Finished rendering.')


