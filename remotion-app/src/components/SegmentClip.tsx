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

const buildTransitionStyle = (
  transition: TransitionPlan | undefined,
  progress: number,
  width: number,
  height: number
) => {
  if (!transition) {
    return {translateX: 0, translateY: 0, opacity: 1};
  }

  if (transition.type === 'cut') {
    return {translateX: 0, translateY: 0, opacity: 1};
  }

  if (transition.type === 'crossfade') {
    return {translateX: 0, translateY: 0, opacity: progress};
  }

  if (transition.type === 'slide') {
    const offset = resolveSlideOffset(transition.direction, width, height);
    const slideProgress = 1 - progress;
    return {
      translateX: offset.x * slideProgress,
      translateY: offset.y * slideProgress,
      opacity: 1,
    };
  }

  return {translateX: 0, translateY: 0, opacity: 1};
};

export interface SegmentClipProps {
  timelineSegment: TimelineSegment;
  source: string;
  fps: number;
}

export const SegmentClip: React.FC<SegmentClipProps> = ({timelineSegment, source, fps}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {segment, from, duration, transitionInFrames, transitionOutFrames} = timelineSegment;

  const localFrame = frame - from;
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
    () => buildTransitionStyle(segment.transitionIn, fadeIn, width, height),
    [fadeIn, height, segment.transitionIn, width]
  );

  const exit = useMemo(
    () => buildTransitionStyle(segment.transitionOut, fadeOut, width, height),
    [fadeOut, height, segment.transitionOut, width]
  );

  const startFrom = Math.round(segment.sourceStart * fps);
  const endAt = startFrom + duration;

  const style: CSSProperties = {
    opacity: (enter.opacity ?? 1) * (exit.opacity ?? 1),
    transform: `translate(${(enter.translateX ?? 0) + (exit.translateX ?? 0)}px, ${
      (enter.translateY ?? 0) + (exit.translateY ?? 0)
    }px)`,
    willChange: 'opacity, transform',
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
        />
      </div>
    </div>
  );
};
