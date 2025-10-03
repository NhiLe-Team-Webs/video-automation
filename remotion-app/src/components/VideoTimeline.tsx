import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import type {Plan, SegmentPlan} from '../types';
import {SegmentClip} from './SegmentClip';
import {buildTimeline, getPlanDuration, type TimelineSegment} from './timeline';

interface VideoTimelineProps {
  plan: Plan;
  fps: number;
  fallbackTransitionDuration: number;
  inputVideo: string;
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
}) => {
  const source = staticFile(inputVideo);
  const {timeline} = buildTimelineMetadata(plan.segments, fps, fallbackTransitionDuration);

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      {timeline.map((timelineSegment) => (
        <Sequence
          key={timelineSegment.segment.id}
          from={timelineSegment.from}
          durationInFrames={timelineSegment.duration}
          name={`segment-${timelineSegment.segment.id}`}
        >
          <SegmentClip timelineSegment={timelineSegment} source={source} fps={fps} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
