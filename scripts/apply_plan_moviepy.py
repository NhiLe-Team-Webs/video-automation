import json
import os
import sys

from moviepy import (
    AudioFileClip,
    CompositeAudioClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)

if len(sys.argv) < 5:
    print('Usage: python apply_plan_moviepy.py <input_video> <plan.json> <logo_path or NONE> <output_video>')
    sys.exit(1)

input_video, plan_file, logo_path, output_file = sys.argv[1:5]

print(f'[INFO] Loading video: {input_video}')
source_clip = VideoFileClip(input_video)

with open(plan_file, 'r', encoding='utf-8') as handle:
    plan = json.load(handle)

segments = plan.get('segments', [])

if segments:
    print(f'[INFO] Detected {len(segments)} planned segments; trimming source clip.')
    subclips = []
    for idx, segment in enumerate(segments, start=1):
        start = float(segment['start'])
        end = float(segment['end'])
        print(f'  - Segment {idx}: {start:.3f}s to {end:.3f}s')
        subclips.append(source_clip.subclipped(start, end))
    base_clip = concatenate_videoclips(subclips, method='compose') if subclips else source_clip
else:
    print('[WARN] Plan provided no segments; using full source clip.')
    base_clip = source_clip

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
        start_time = float(action.get('time', 0.0))
        print(f'[SFX] {asset} at {start_time:.3f}s')
        layers_a.append(AudioFileClip(asset).with_start(start_time))

    elif action_type == 'zoom':
        start_time = float(action.get('start', 0.0))
        end_time = float(action.get('end', start_time))
        if end_time <= start_time:
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
        start_time = float(action.get('time', 0.0))
        duration = float(action.get('duration', 0.5))
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

ffmpeg_params = []
audio_filters = []
filters_cfg = plan.get('audio', {}).get('filters', {})
if filters_cfg:
    highpass = filters_cfg.get('highpass_hz')
    lowpass = filters_cfg.get('lowpass_hz')
    if isinstance(highpass, (int, float)) and highpass > 0:
        audio_filters.append(f'highpass=f={highpass}')
    if isinstance(lowpass, (int, float)) and lowpass > 0:
        audio_filters.append(f'lowpass=f={lowpass}')
    if audio_filters:
        ffmpeg_params += ['-af', ','.join(audio_filters)]
        print(f'[AUDIO] Applying filters: {", ".join(audio_filters)}')

print(f'[EXPORT] Writing final video to: {output_file}')
composite.write_videofile(
    output_file,
    fps=base_clip.fps or 30,
    codec='libx264',
    audio_codec='aac',
    ffmpeg_params=ffmpeg_params or None,
)
print('[DONE] Finished rendering.')
