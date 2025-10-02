import {useMemo} from 'react';
import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Video} from 'remotion';
import type {TimelineSegment} from './timeline';
import type {TransitionPlan} from '../types';

const resolveSlideOffset = (direction: TransitionPlan['direction'], width: number, height: number) => {
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

type TransitionPhase = 'in' | 'out';

interface TransitionStyle {
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  filter?: string;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const buildTransitionStyle = (
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
  const t = clamp01(normalized);

  if (transition.type === 'crossfade') {
    return {opacity: phase === 'in' ? t : 1 - t};
  }

  if (transition.type === 'slide') {
    const offset = resolveSlideOffset(transition.direction, width, height);
    if (phase === 'in') {
      return {
        translateX: offset.x * (1 - t),
        translateY: offset.y * (1 - t),
        opacity: Math.max(t, 0.75),
      };
    }

    return {
      translateX: offset.x * t,
      translateY: offset.y * t,
      opacity: 1 - t * 0.15,
    };
  }

  if (transition.type === 'zoom') {
    const intensity = transition.intensity ?? 0.15;
    if (phase === 'in') {
      return {
        scale: 1 + intensity * (1 - t),
        opacity: t,
      };
    }

    return {
      scale: 1 + intensity * t,
      opacity: 1 - t * 0.25,
    };
  }

  if (transition.type === 'scale') {
    const intensity = transition.intensity ?? 0.12;
    const base = phase === 'in' ? 1 - intensity * (1 - t) : 1 - intensity * t;
    return {
      scale: base,
      opacity: phase === 'in' ? t : 1 - t * 0.2,
    };
  }

  if (transition.type === 'rotate') {
    const degrees = (transition.intensity ?? 0.1) * 25;
    if (phase === 'in') {
      return {
        rotate: -degrees * (1 - t),
        opacity: t,
      };
    }

    return {
      rotate: degrees * t,
      opacity: 1 - t * 0.25,
    };
  }

  if (transition.type === 'blur') {
    const maxBlur = (transition.intensity ?? 0.5) * 12;
    if (phase === 'in') {
      return {
        filter: `blur(${(1 - t) * maxBlur}px)`,
        opacity: t,
      };
    }

    return {
      filter: `blur(${t * maxBlur}px)`,
      opacity: 1 - t * 0.3,
    };
  }

  return {};
};

export interface SegmentClipProps {
  timelineSegment: TimelineSegment;
  source: string;
  fps: number;
}

export const SegmentClip: React.FC<SegmentClipProps> = ({timelineSegment, source, fps}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {segment, duration, transitionInFrames, transitionOutFrames} = timelineSegment;

  const localFrame = frame;
  const cappedFrame = Math.max(0, Math.min(localFrame, duration));

  const fadeIn = transitionInFrames
    ? interpolate(cappedFrame, [0, transitionInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const fadeOut = transitionOutFrames
    ? interpolate(cappedFrame, [duration - transitionOutFrames, duration], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const enter = useMemo(
    () => buildTransitionStyle(segment.transitionIn, fadeIn, width, height, 'in'),
    [fadeIn, height, segment.transitionIn, width]
  );

  const exit = useMemo(
    () => buildTransitionStyle(segment.transitionOut, fadeOut, width, height, 'out'),
    [fadeOut, height, segment.transitionOut, width]
  );

  const startFrom = Math.round(segment.sourceStart * fps);
  const endAt = startFrom + duration;

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

  const playbackRate = segment.playbackRate ?? 1;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    >
      <div style={style}>
        <Video
          src={source}
          startFrom={startFrom}
          endAt={endAt}
          playbackRate={playbackRate}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </div>
    </div>
  );
};
