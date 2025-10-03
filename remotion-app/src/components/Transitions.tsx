import type {CSSProperties} from 'react';
import {useMemo} from 'react';
import {interpolate} from 'remotion';
import type {TransitionPlan} from '../types';

export type TransitionPhase = 'in' | 'out';

interface TransitionStyle {
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  filter?: string;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const easeInOutCubic = (value: number) => {
  const clamped = clamp01(value);
  if (clamped < 0.5) {
    return 4 * clamped * clamped * clamped;
  }
  return 1 - Math.pow(-2 * clamped + 2, 3) / 2;
};

const resolveSlideOffset = (
  direction: TransitionPlan['direction'],
  width: number,
  height: number
) => {
  switch (direction) {
    case 'left':
      return {x: -width, y: 0};
    case 'right':
      return {x: width, y: 0};
    case 'up':
      return {x: 0, y: -height};
    case 'down':
      return {x: 0, y: height};
    default:
      return {x: 0, y: 0};
  }
};

const evaluateTransitionStyle = (
  transition: TransitionPlan | undefined,
  progress: number,
  width: number,
  height: number,
  phase: TransitionPhase
): TransitionStyle => {
  if (!transition) {
    return {};
  }

  if (transition.type === 'cut') {
    return {};
  }

  const normalized = phase === 'out' ? 1 - progress : progress;
  const eased = easeInOutCubic(normalized);

  switch (transition.type) {
    case 'fadeCamera': {
      if (phase === 'in') {
        const blur = (1 - eased) * 4;
        const brightness = 0.88 + eased * 0.12;
        const contrast = 0.9 + eased * 0.1;
        return {
          opacity: eased,
          filter: `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`,
        };
      }
      const blur = eased * 6;
      const brightness = 1 - eased * 0.1;
      const contrast = 1 - eased * 0.12;
      return {
        opacity: 1 - eased,
        filter: `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`,
      };
    }
    case 'slideWhoosh': {
      const offset = resolveSlideOffset(transition.direction, width, height);
      const easeOut = easeInOutCubic(progress);
      const translateX = offset.x * (phase === 'in' ? 1 - easeOut : easeOut);
      const translateY = offset.y * (phase === 'in' ? 1 - easeOut : easeOut);
      const blur = Math.max(0, 6 * (phase === 'in' ? 1 - easeOut : easeOut));
      const opacity = phase === 'in' ? Math.max(easeOut, 0.72) : 1 - easeOut * 0.2;
      return {
        translateX,
        translateY,
        opacity,
        filter: `blur(${blur}px) saturate(${1 + easeOut * 0.1})`,
      };
    }
    default:
      return {};
  }
};

export interface UseSegmentTransitionOptions {
  transitionIn?: TransitionPlan;
  transitionOut?: TransitionPlan;
  transitionInFrames: number;
  transitionOutFrames: number;
  frame: number;
  durationInFrames: number;
  width: number;
  height: number;
  fps: number;
  audioCrossfade: boolean;
  defaultTransitionDuration: number;
}

export interface SegmentTransitionResult {
  style: CSSProperties;
  volume: number;
}

const computeProgress = (value: number) => clamp01(value);

const computeAudioFadeFrames = (
  frames: number,
  fps: number,
  defaultTransitionDuration: number
) => {
  const minFrames = Math.max(1, Math.round(fps * 0.5));
  const maxFrames = Math.max(minFrames, Math.round(fps * 1.2));
  const fallbackFrames = Math.round(defaultTransitionDuration * fps);
  const candidate = frames > 0 ? frames : fallbackFrames;
  return Math.max(minFrames, Math.min(candidate, maxFrames));
};

export const useSegmentTransition = (
  options: UseSegmentTransitionOptions
): SegmentTransitionResult => {
  const {
    transitionIn,
    transitionOut,
    transitionInFrames,
    transitionOutFrames,
    frame,
    durationInFrames,
    width,
    height,
    fps,
    audioCrossfade,
    defaultTransitionDuration,
  } = options;

  return useMemo(() => {
    const fadeInProgress =
      transitionInFrames > 0
        ? computeProgress(interpolate(frame, [0, transitionInFrames], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }))
        : 1;

    const fadeOutProgress =
      transitionOutFrames > 0
        ? computeProgress(
            interpolate(frame, [durationInFrames - transitionOutFrames, durationInFrames], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          )
        : 1;

    const enter = evaluateTransitionStyle(transitionIn, fadeInProgress, width, height, 'in');
    const exit = evaluateTransitionStyle(transitionOut, fadeOutProgress, width, height, 'out');

    const opacity = (enter.opacity ?? 1) * (exit.opacity ?? 1);
    const translateX = (enter.translateX ?? 0) + (exit.translateX ?? 0);
    const translateY = (enter.translateY ?? 0) + (exit.translateY ?? 0);
    const scale = (enter.scale ?? 1) * (exit.scale ?? 1);
    const rotate = (enter.rotate ?? 0) + (exit.rotate ?? 0);
    const filters = [enter.filter, exit.filter].filter(Boolean).join(' ');

    const transformParts = [
      `translate(${translateX}px, ${translateY}px)`,
      scale !== 1 ? `scale(${scale})` : null,
      rotate !== 0 ? `rotate(${rotate}deg)` : null,
    ].filter(Boolean);

    const style: CSSProperties = {
      opacity,
      transform: transformParts.join(' ') || 'translate(0px, 0px)',
      filter: filters || undefined,
      transformOrigin: 'center center',
      willChange: 'opacity, transform, filter',
    };

    if (!audioCrossfade) {
      return {style, volume: 1};
    }

    const audioFadeInFrames = computeAudioFadeFrames(
      transitionInFrames,
      fps,
      defaultTransitionDuration
    );
    const audioFadeOutFrames = computeAudioFadeFrames(
      transitionOutFrames,
      fps,
      defaultTransitionDuration
    );

    const audioIn = interpolate(frame, [0, audioFadeInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const audioOut = interpolate(
      frame,
      [durationInFrames - audioFadeOutFrames, durationInFrames],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const volume = clamp01(audioIn) * clamp01(audioOut);

    return {style, volume};
  }, [
    frame,
    durationInFrames,
    height,
    transitionIn,
    transitionInFrames,
    transitionOut,
    transitionOutFrames,
    width,
    fps,
    audioCrossfade,
    defaultTransitionDuration,
  ]);
};
