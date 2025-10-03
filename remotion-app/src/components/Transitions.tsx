import type {CSSProperties} from 'react';
import {useMemo} from 'react';
import {Easing, interpolate} from 'remotion';
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
const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

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
  const eased = easeInOut(clamp01(normalized));

  switch (transition.type) {
    case 'crossfade':
      return {opacity: phase === 'in' ? eased : 1 - eased};
    case 'slide': {
      const offset = resolveSlideOffset(transition.direction, width, height);
      if (phase === 'in') {
        return {
          translateX: offset.x * (1 - eased),
          translateY: offset.y * (1 - eased),
          opacity: Math.max(eased, 0.75),
        };
      }
      return {
        translateX: offset.x * eased,
        translateY: offset.y * eased,
        opacity: 1 - eased * 0.2,
      };
    }
    case 'zoom': {
      const intensity = transition.intensity ?? 0.18;
      if (phase === 'in') {
        return {
          scale: 1 + intensity * (1 - eased),
          opacity: eased,
        };
      }
      return {
        scale: 1 + intensity * eased,
        opacity: 1 - eased * 0.25,
      };
    }
    case 'scale': {
      const intensity = transition.intensity ?? 0.12;
      const base = phase === 'in' ? 1 - intensity * (1 - eased) : 1 - intensity * eased;
      return {
        scale: base,
        opacity: phase === 'in' ? eased : 1 - eased * 0.2,
      };
    }
    case 'rotate': {
      const degrees = (transition.intensity ?? 0.1) * 25;
      if (phase === 'in') {
        return {
          rotate: -degrees * (1 - eased),
          opacity: eased,
        };
      }
      return {
        rotate: degrees * eased,
        opacity: 1 - eased * 0.25,
      };
    }
    case 'blur': {
      const maxBlur = (transition.intensity ?? 0.5) * 12;
      if (phase === 'in') {
        return {
          filter: `blur(${(1 - eased) * maxBlur}px)`,
          opacity: eased,
        };
      }
      return {
        filter: `blur(${eased * maxBlur}px)`,
        opacity: 1 - eased * 0.3,
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
}

export interface SegmentTransitionResult {
  style: CSSProperties;
  volume: number;
}

const computeProgress = (value: number) => clamp01(value);

const computeAudioFadeFrames = (frames: number, fps: number) => {
  const minFrames = Math.max(1, Math.round(fps * 0.5));
  const maxFrames = Math.max(minFrames, Math.round(fps * 1.5));
  if (frames <= 0) {
    return minFrames;
  }
  return Math.max(minFrames, Math.min(frames, maxFrames));
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

    const audioFadeInFrames = computeAudioFadeFrames(transitionInFrames, fps);
    const audioFadeOutFrames = computeAudioFadeFrames(transitionOutFrames, fps);

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
  ]);
};
