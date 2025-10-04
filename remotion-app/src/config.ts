import type {CompositionConfigOverrides} from './types';

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;

const fallbackDurationSeconds = 15 * 60; // 15 minutes default cap
export const DEFAULT_DURATION_IN_FRAMES = VIDEO_FPS * fallbackDurationSeconds;

export const AUDIO = {
  voiceDuckDb: -4,
  sfxBaseGainDb: -10,
};

export const TRANSITIONS = {
  minPauseMs: 700,
  defaultFade: 0.8,
};

export const BRAND = {
  primary: '#C8102E',
  red: '#C8102E',
  secondary: '#1C1C1C',
  charcoal: '#1C1C1C',
  black: '#1C1C1C',
  white: '#FFFFFF',
  lightGray: '#F2F2F2',
  gradient: 'linear-gradient(135deg, rgba(200,16,46,0.95) 0%, rgba(28,28,28,0.98) 60%, rgba(12,12,12,1) 100%)',
  radialGlow: 'radial-gradient(circle at 20% 20%, rgba(200,16,46,0.25), transparent 65%)',
  fonts: {
    heading: "'Montserrat', 'Helvetica Neue', 'Inter', sans-serif",
    body: "'Open Sans', 'Helvetica Neue', 'Inter', sans-serif",
  },
  overlays: {
    glassBackground: 'rgba(200,16,46,0.48)',
    glassBorder: 'rgba(255,255,255,0.22)',
    accentGradient: 'linear-gradient(135deg, rgba(200,16,46,0.9) 0%, rgba(98,11,24,0.9) 100%)',
    triangle: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(200,16,46,0.6) 100%)',
  },
};

export interface RuntimeConfig {
  audio: typeof AUDIO;
  transitions: typeof TRANSITIONS;
  brand: typeof BRAND;
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeNumber = (input: unknown, fallback: number, {min, max}: {min?: number; max?: number} = {}) => {
  const numeric = Number(input);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  if (typeof min === 'number' || typeof max === 'number') {
    return clampNumber(
      numeric,
      typeof min === 'number' ? min : numeric,
      typeof max === 'number' ? max : numeric
    );
  }
  return numeric;
};

export const resolveRuntimeConfig = (
  overrides: CompositionConfigOverrides | undefined | null
): RuntimeConfig => {
  const audio = {
    ...AUDIO,
    ...(overrides?.audio ?? {}),
  } as typeof AUDIO;

  audio.voiceDuckDb = normalizeNumber(audio.voiceDuckDb, AUDIO.voiceDuckDb, {min: -24, max: 0});
  audio.sfxBaseGainDb = normalizeNumber(audio.sfxBaseGainDb, AUDIO.sfxBaseGainDb, {min: -36, max: -1});

  const transitions = {
    ...TRANSITIONS,
    ...(overrides?.transitions ?? {}),
  } as typeof TRANSITIONS;

  const explicitMinPause = overrides?.minPauseMs;
  if (typeof explicitMinPause === 'number' && !Number.isNaN(explicitMinPause)) {
    transitions.minPauseMs = clampNumber(explicitMinPause, 0, 4000);
  } else {
    transitions.minPauseMs = normalizeNumber(transitions.minPauseMs, TRANSITIONS.minPauseMs, {
      min: 0,
      max: 4000,
    });
  }

  transitions.defaultFade = normalizeNumber(transitions.defaultFade, TRANSITIONS.defaultFade, {
    min: 0.3,
    max: 2.4,
  });

  const brand = {
    ...BRAND,
    ...(overrides?.brand ?? {}),
  } as typeof BRAND;

  return {
    audio,
    transitions,
    brand,
  };
};
