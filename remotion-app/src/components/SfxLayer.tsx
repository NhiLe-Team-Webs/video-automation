import {Audio, Sequence, staticFile} from 'remotion';
import {SFX_CATALOG} from '../data/sfxCatalog';
import type {HighlightPlan} from '../types';
import {resolveIconVisual} from '../icons/registry';
import type {TimelineSegment} from './timeline';
import type {RuntimeConfig} from '../config';

const SFX_LOOKUP = (() => {
  const entries = new Map<string, string>();

  for (const relativePath of SFX_CATALOG) {
    const canonical = relativePath.startsWith('assets/') ? relativePath : `assets/sfx/${relativePath}`;
    const withoutPrefix = canonical.replace(/^assets\//, '');
    const lowerCanonical = canonical.toLowerCase();
    const lowerRelative = withoutPrefix.toLowerCase();

    entries.set(lowerCanonical, canonical);
    entries.set(lowerRelative, canonical);

    const fileName = withoutPrefix.split('/').pop();
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();
      entries.set(lowerFileName, canonical);

      const stem = lowerFileName.replace(/\.[^.]+$/, '');
      entries.set(stem, canonical);
    }
  }

  return entries;
})();

const stripStaticHash = (value: string) => value.replace(/^static-[^/]+\//, '');

const normalizeSfx = (value: string | undefined | null): string | null => {
  if (!value) {
    return null;
  }

  const sanitized = stripStaticHash(value)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .trim();

  if (!sanitized) {
    return null;
  }

  const lower = sanitized.toLowerCase();
  const withoutAssets = lower.startsWith('assets/') ? lower.slice(7) : lower;
  const withoutSfx = withoutAssets.startsWith('sfx/') ? withoutAssets.slice(4) : withoutAssets;

  const candidates = [
    lower,
    withoutAssets,
    withoutSfx,
    `assets/${withoutAssets}`,
    `assets/sfx/${withoutSfx}`,
    `sfx/${withoutSfx}`,
  ];

  const fileName = sanitized.split('/').pop();
  if (fileName) {
    candidates.push(fileName.toLowerCase());
    candidates.push(fileName.replace(/\.[^.]+$/, '').toLowerCase());
  }

  for (const key of candidates) {
    const match = SFX_LOOKUP.get(key);
    if (match) {
      return match;
    }
  }

  if (sanitized.startsWith('assets/')) {
    return sanitized;
  }

  if (sanitized.startsWith('sfx/')) {
    return `assets/${sanitized}`;
  }

  if (sanitized.includes('/')) {
    return `assets/sfx/${sanitized}`;
  }

  return `assets/sfx/${sanitized}`;
};

const dbToGain = (db: number) => Math.pow(10, db / 20);

interface SfxEvent {
  id: string;
  startFrame: number;
  durationInFrames: number;
  src: string;
  gainDb?: number;
  ducking: boolean;
}

const eventFromHighlight = (
  highlight: HighlightPlan,
  fps: number
): Pick<SfxEvent, 'startFrame' | 'durationInFrames' | 'gainDb' | 'ducking'> => {
  const startFrame = Math.round(highlight.start * fps);
  const durationInFrames = Math.max(1, Math.round(highlight.duration * fps));
  let gainDb = highlight.gain;
  if (gainDb == null && typeof highlight.volume === 'number' && highlight.volume > 0) {
    gainDb = 20 * Math.log10(highlight.volume);
  }

  return {
    startFrame,
    durationInFrames,
    gainDb,
    ducking: highlight.ducking !== false,
  };
};

const collectTransitionEvents = (
  timeline: TimelineSegment[],
  fps: number
): SfxEvent[] => {
  const events: SfxEvent[] = [];

  timeline.forEach((segment, index) => {
    const plan = segment.segment;
    const transition = plan.transitionOut;
    if (!transition?.sfx) {
      return;
    }
    const startFrame = segment.from + Math.max(0, segment.duration - segment.transitionOutFrames);
    const durationSeconds = transition.duration ?? segment.transitionOutFrames / fps;
    const durationInFrames = Math.max(1, Math.round(durationSeconds * fps));
    const normalized = normalizeSfx(transition.sfx);
    if (!normalized) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Could not resolve transition SFX asset for segment ${plan.id}`);
      }
      return;
    }

    events.push({
      id: `${plan.id}-transition-${index}`,
      startFrame,
      durationInFrames,
      src: normalized,
      ducking: false,
    });
  });

  return events;
};

const collectHighlightEvents = (highlights: HighlightPlan[], fps: number): SfxEvent[] => {
  const events: SfxEvent[] = [];

  highlights.forEach((highlight) => {
    const iconFallback =
      (highlight.type ?? 'noteBox') === 'icon'
        ? resolveIconVisual(
            typeof highlight.icon === 'string' && highlight.icon.trim()
              ? highlight.icon
              : typeof highlight.name === 'string' && highlight.name.trim()
                ? highlight.name
                : undefined
          )?.defaultSfx
        : undefined;

    const requestedSfx = highlight.sfx ?? iconFallback;

    if (!requestedSfx) {
      return;
    }
    const normalized = normalizeSfx(requestedSfx);
    if (!normalized) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Could not resolve SFX asset for highlight ${highlight.id}`);
      }
      return;
    }

    const timings = eventFromHighlight(highlight, fps);
    events.push({
      id: `highlight-${highlight.id}`,
      src: normalized,
      ...timings,
    });
  });

  return events;
};

const buildVolumeEnvelope = (
  event: SfxEvent,
  audioConfig: RuntimeConfig['audio'],
  fps: number
) => {
  const baseDb = event.gainDb ?? audioConfig.sfxBaseGainDb;
  const baseGain = Math.min(dbToGain(baseDb), dbToGain(-6));
  const duckGain = dbToGain(audioConfig.voiceDuckDb);
  const attackFrames = Math.max(1, Math.round(fps * 0.3));
  const releaseFrames = Math.max(1, Math.round(fps * 0.3));
  const fadeInFrames = Math.max(1, Math.round(fps * 0.12));
  const fadeOutFrames = Math.max(1, Math.round(fps * 0.16));

  return (frame: number) => {
    const duckProgress = Math.min(frame / attackFrames, 1);
    const fadeIn = Math.min(frame / fadeInFrames, 1);
    const fadeOut = Math.min((event.durationInFrames - frame) / fadeOutFrames, 1);
    const release = Math.min((event.durationInFrames - frame) / releaseFrames, 1);
    const duckMultiplier = event.ducking ? duckGain + (1 - duckGain) * duckProgress : 1;
    const amplitude = baseGain * duckMultiplier * fadeIn * Math.max(0, fadeOut) * Math.max(0, release);
    return Math.min(amplitude, dbToGain(-6));
  };
};

interface SfxLayerProps {
  highlights: HighlightPlan[];
  timeline: TimelineSegment[];
  fps: number;
  audioConfig: RuntimeConfig['audio'];
}

export const SfxLayer: React.FC<SfxLayerProps> = ({highlights, timeline, fps, audioConfig}) => {
  const events = [...collectHighlightEvents(highlights, fps), ...collectTransitionEvents(timeline, fps)].sort(
    (a, b) => a.startFrame - b.startFrame
  );

  return (
    <>
      {events.map((event) => {
        const resolved = normalizeSfx(event.src);
        if (!resolved) {
          return null;
        }
        const src = staticFile(resolved);
        return (
          <Sequence
            key={`sfx-${event.id}`}
            from={event.startFrame}
            durationInFrames={event.durationInFrames}
            name={`sfx-${event.id}`}
          >
            <Audio src={src} volume={buildVolumeEnvelope(event, audioConfig, fps)} />
          </Sequence>
        );
      })}
    </>
  );
};
