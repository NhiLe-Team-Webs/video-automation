import {Audio, Sequence, staticFile} from 'remotion';
import {SFX_CATALOG} from '../data/sfxCatalog';
import type {HighlightPlan} from '../types';

const SFX_LOOKUP = (() => {
  const entries = new Map<string, string>();

  for (const relativePath of SFX_CATALOG) {
    const canonical = `sfx/${relativePath}`;
    const lowerCanonical = canonical.toLowerCase();
    const lowerRelative = relativePath.toLowerCase();

    entries.set(lowerCanonical, canonical);
    entries.set(lowerRelative, canonical);

    const fileName = relativePath.split('/').pop();
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
  const withoutPrefix = lower.startsWith('sfx/') ? lower.slice(4) : lower;

  const candidates = [lower, withoutPrefix];

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

  if (sanitized.startsWith('sfx/')) {
    return sanitized;
  }

  if (sanitized.includes('/')) {
    return `sfx/${sanitized}`;
  }

  return `sfx/${sanitized}`;
};

interface SfxLayerProps {
  highlights: HighlightPlan[];
  fps: number;
}

export const SfxLayer: React.FC<SfxLayerProps> = ({highlights, fps}) => {
  return (
    <>
      {highlights
        .filter((highlight) => highlight.sfx)
        .map((highlight) => {
          const from = Math.round(highlight.start * fps);
          const duration = Math.max(1, Math.round(highlight.duration * fps));
          const volume = highlight.volume ?? 0.7;
          const resolved = normalizeSfx(highlight.sfx);
          if (!resolved) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`Could not resolve SFX asset for: ${highlight.sfx}`);
            }
            return null;
          }

          const src = staticFile(resolved);
          return (
            <Sequence key={`sfx-${highlight.id}`} from={from} durationInFrames={duration} name={`sfx-${highlight.id}`}>
              <Audio src={src} volume={volume} />
            </Sequence>
          );
        })}
    </>
  );
};
