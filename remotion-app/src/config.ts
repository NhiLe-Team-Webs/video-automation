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
  red: '#C8102E',
  black: '#1C1C1C',
  white: '#fff',
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
