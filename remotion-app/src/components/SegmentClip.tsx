import {useMemo} from 'react';
import type {CSSProperties} from 'react';
import {Easing, useCurrentFrame, useVideoConfig, Video} from 'remotion';
import type {TimelineSegment} from './timeline';
import type {CameraMovement} from '../types';
import {useSegmentTransition} from './Transitions';

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const normalizeCameraMovement = (movement: unknown): CameraMovement => {
  if (movement === 'zoomIn' || movement === 'zoomOut') {
    return movement;
  }
  if (typeof movement === 'string') {
    const lower = movement.toLowerCase();
    if (['zoomin', 'zoom-in', 'pushin', 'push'].includes(lower)) {
      return 'zoomIn';
    }
    if (['zoomout', 'zoom-out', 'pullback', 'pull'].includes(lower)) {
      return 'zoomOut';
    }
  }
  return 'static';
};

const resolveCameraMovement = (segment: TimelineSegment['segment']): CameraMovement => {
  if (segment.cameraMovement && segment.cameraMovement !== 'static') {
    return segment.cameraMovement;
  }
  const metadataValue = segment.metadata?.['cameraMovement'];
  return normalizeCameraMovement(metadataValue);
};

const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

const computeCameraTransform = (
  movement: CameraMovement,
  frame: number,
  duration: number
): CSSProperties => {
  if (movement === 'static') {
    return {
      transform: 'scale(1)',
      transformOrigin: 'center center',
      willChange: 'transform',
    };
  }

  const progress = duration <= 1 ? 1 : clamp01(frame / Math.max(1, duration - 1));
  const eased = easeInOut(progress);
  const startScale = movement === 'zoomIn' ? 1 : 1.08;
  const endScale = movement === 'zoomIn' ? 1.08 : 1;
  const scale = startScale + (endScale - startScale) * eased;
  const driftDirection = movement === 'zoomIn' ? -1 : 1;
  const drift = Math.sin(eased * Math.PI) * 12 * driftDirection;

  const transformParts = [`scale(${scale})`];
  if (Math.abs(drift) > 0.1) {
    transformParts.push(`translateY(${drift}px)`);
  }

  return {
    transform: transformParts.join(' '),
    transformOrigin: 'center center',
    willChange: 'transform',
  };
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

  const cappedFrame = Math.max(0, Math.min(frame, duration));

  const {style: transitionStyle, volume} = useSegmentTransition({
    transitionIn: segment.transitionIn,
    transitionOut: segment.transitionOut,
    transitionInFrames,
    transitionOutFrames,
    frame: cappedFrame,
    durationInFrames: duration,
    width,
    height,
    fps,
  });

  const startFrom = Math.round(segment.sourceStart * fps);
  const endAt = startFrom + duration;
  const playbackRate = segment.playbackRate ?? 1;

  const cameraMovement = resolveCameraMovement(segment);
  const cameraStyle = useMemo(
    () => computeCameraTransform(cameraMovement, cappedFrame, duration),
    [cameraMovement, cappedFrame, duration]
  );

  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  };

  const transitionContainerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    ...transitionStyle,
  };

  const videoStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    ...cameraStyle,
  };

  return (
    <div style={containerStyle}>
      <div style={transitionContainerStyle}>
        <Video
          src={source}
          startFrom={startFrom}
          endAt={endAt}
          playbackRate={playbackRate}
          volume={volume}
          style={videoStyle}
        />
      </div>
    </div>
  );
};
