import type {SegmentPlan, TransitionPlan} from '../types';

export interface TimelineSegment {
  segment: SegmentPlan;
  from: number;
  duration: number;
  transitionInFrames: number;
  transitionOutFrames: number;
}

const toFrames = (seconds: number, fps: number) => Math.max(0, Math.round(seconds * fps));

const resolveTransitionDuration = (
  transition: TransitionPlan | undefined,
  fps: number,
  fallbackSeconds: number,
  maxDurationFrames: number
) => {
  if (!transition) {
    return 0;
  }

  const targetSeconds = transition.duration ?? fallbackSeconds;
  const frames = toFrames(targetSeconds, fps);
  return Math.min(Math.max(frames, 0), Math.floor(maxDurationFrames));
};

export const buildTimeline = (
  segments: SegmentPlan[],
  fps: number,
  fallbackTransitionSeconds: number
): TimelineSegment[] => {
  const timeline: TimelineSegment[] = [];

  segments.forEach((segment, index) => {
    const durationFrames = Math.max(1, toFrames(segment.duration, fps));
    const maxTransitionFrames = durationFrames / 2;

    const transitionInFrames = resolveTransitionDuration(
      segment.transitionIn,
      fps,
      fallbackTransitionSeconds,
      maxTransitionFrames
    );

    const explicitOut = segment.transitionOut ?? segments[index + 1]?.transitionIn;
    const transitionOutFrames = resolveTransitionDuration(
      explicitOut,
      fps,
      fallbackTransitionSeconds,
      maxTransitionFrames
    );

    if (index === 0) {
      timeline.push({
        segment,
        from: 0,
        duration: durationFrames,
        transitionInFrames,
        transitionOutFrames,
      });
      return;
    }

    const previous = timeline[index - 1];
    const overlap = Math.max(previous.transitionOutFrames, transitionInFrames);
    const from = previous.from + previous.duration - overlap;

    timeline.push({
      segment,
      from,
      duration: durationFrames,
      transitionInFrames,
      transitionOutFrames,
    });
  });

  return timeline;
};

export const getPlanDuration = (timeline: TimelineSegment[]): number => {
  if (!timeline.length) {
    return 0;
  }

  const last = timeline[timeline.length - 1];
  return last.from + last.duration;
};
