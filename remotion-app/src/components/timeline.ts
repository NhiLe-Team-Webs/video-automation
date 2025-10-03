import type {SegmentPlan, TransitionPlan} from '../types';

export interface TimelineSegment {
  segment: SegmentPlan;
  from: number;
  duration: number;
  transitionInFrames: number;
  transitionOutFrames: number;
  audioCrossfade: boolean;
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
    const allowIn = index > 0 ? segments[index - 1].silenceAfter !== false : false;
    const allowOut = segment.silenceAfter !== false;

    const segmentForTimeline: SegmentPlan = {...segment};

    if (!allowIn) {
      segmentForTimeline.transitionIn = undefined;
    }

    let effectiveOut = allowOut ? segmentForTimeline.transitionOut : undefined;
    if (allowOut && !effectiveOut) {
      const next = segments[index + 1];
      if (next?.transitionIn) {
        effectiveOut = next.transitionIn;
      }
    }

    segmentForTimeline.transitionOut = allowOut ? effectiveOut : undefined;

    const transitionInFrames = allowIn
      ? resolveTransitionDuration(
          segmentForTimeline.transitionIn,
          fps,
          fallbackTransitionSeconds,
          maxTransitionFrames
        )
      : 0;

    const transitionOutFrames = allowOut
      ? resolveTransitionDuration(
          segmentForTimeline.transitionOut,
          fps,
          fallbackTransitionSeconds,
          maxTransitionFrames
        )
      : 0;

    if (index === 0) {
      timeline.push({
        segment: segmentForTimeline,
        from: 0,
        duration: durationFrames,
        transitionInFrames,
        transitionOutFrames,
        audioCrossfade: false,
      });
      return;
    }

    const previous = timeline[index - 1];
    const overlap = Math.max(previous.transitionOutFrames, transitionInFrames);
    const from = previous.from + previous.duration - overlap;

    timeline.push({
      segment: segmentForTimeline,
      from,
      duration: durationFrames,
      transitionInFrames,
      transitionOutFrames,
      audioCrossfade: allowIn,
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
