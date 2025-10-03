import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import type {Plan, SegmentPlan} from '../types';
import type {RuntimeConfig} from '../config';
import {SegmentClip} from './SegmentClip';
import {buildTimeline, getPlanDuration, type TimelineSegment} from './timeline';

interface VideoTimelineProps {
  plan: Plan;
  fps: number;
  fallbackTransitionDuration: number;
  inputVideo: string;
  runtimeConfig: RuntimeConfig;
  timeline?: TimelineSegment[];
}

export interface TimelineMetadata {
  timeline: TimelineSegment[];
  totalDurationInFrames: number;
}

export const buildTimelineMetadata = (
  segments: SegmentPlan[],
  fps: number,
  fallbackTransitionDuration: number
): TimelineMetadata => {
  const timeline = buildTimeline(segments, fps, fallbackTransitionDuration);
  const totalDurationInFrames = getPlanDuration(timeline);
  return {timeline, totalDurationInFrames};
};

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  plan,
  fps,
  fallbackTransitionDuration,
  inputVideo,
  runtimeConfig,
  timeline,
}) => {
  const source = staticFile(inputVideo);
  const resolvedTimeline =
    timeline ?? buildTimelineMetadata(plan.segments, fps, fallbackTransitionDuration).timeline;

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      {resolvedTimeline.map((timelineSegment) => (
        <Sequence
          key={timelineSegment.segment.id}
          from={timelineSegment.from}
          durationInFrames={timelineSegment.duration}
          name={`segment-${timelineSegment.segment.id}`}
        >
          <SegmentClip
            timelineSegment={timelineSegment}
            source={source}
            fps={fps}
            audioCrossfade={timelineSegment.audioCrossfade}
            defaultTransitionDuration={runtimeConfig.transitions.defaultFade}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
