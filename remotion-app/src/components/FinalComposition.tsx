import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {useMemo} from 'react';
import {usePlan} from '../hooks/usePlan';
import type {FinalCompositionProps, Plan} from '../types';
import {resolveRuntimeConfig} from '../config';
import {HighlightsLayer} from './HighlightsLayer';
import {SfxLayer} from './SfxLayer';
import {VideoTimeline, buildTimelineMetadata} from './VideoTimeline';
import type {TimelineSegment} from './timeline';

const DEFAULT_TRANSITION_SECONDS = 0.75;

const LoadingState: React.FC<{message: string}> = ({message}) => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e5e7eb',
        fontFamily: 'Inter, sans-serif',
        fontSize: 54,
      }}
    >
      {message}
    </AbsoluteFill>
  );
};

const PlanAwareTimeline: React.FC<{
  plan: Plan;
  fallbackTransitionDuration: number;
  inputVideo: string;
  runtimeConfig: ReturnType<typeof resolveRuntimeConfig>;
  timeline: TimelineSegment[];
}> = ({plan, fallbackTransitionDuration, inputVideo, runtimeConfig, timeline}) => {
  const {fps} = useVideoConfig();
  return (
    <VideoTimeline
      plan={plan}
      fps={fps}
      fallbackTransitionDuration={fallbackTransitionDuration}
      inputVideo={inputVideo}
      runtimeConfig={runtimeConfig}
      timeline={timeline}
    />
  );
};

export const FinalComposition: React.FC<FinalCompositionProps> = ({
  plan,
  planPath = 'input/plan.json',
  inputVideo = 'input/input.mp4',
  fallbackTransitionDuration = DEFAULT_TRANSITION_SECONDS,
  highlightTheme,
  config,
}) => {
  const {fps} = useVideoConfig();
  const shouldLoadPlan = Boolean(planPath);
  const {plan: loadedPlan, status, error} = usePlan(planPath, {enabled: shouldLoadPlan});

  const activePlan = loadedPlan ?? plan ?? null;

  const runtimeConfig = useMemo(() => resolveRuntimeConfig(config), [config]);

  const timelineMetadata = useMemo(() => {
    if (!activePlan) {
      return {
        timeline: [] as TimelineSegment[],
        totalDurationInFrames: fps * 10,
      };
    }
    const computed = buildTimelineMetadata(activePlan.segments, fps, fallbackTransitionDuration);
    return {
      timeline: computed.timeline,
      totalDurationInFrames: Math.max(1, computed.totalDurationInFrames),
    };
  }, [activePlan, fallbackTransitionDuration, fps]);

  if (!activePlan) {
    if (status === 'error') {
      return <LoadingState message={error ?? 'Unable to load the editing plan.'} />;
    }

    return <LoadingState message="Loading editing plan..." />;
  }

  const sanitizedHighlights = activePlan.highlights.filter((highlight) => highlight.duration > 0);

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <Sequence name="video" durationInFrames={timelineMetadata.totalDurationInFrames}>
        <PlanAwareTimeline
          plan={activePlan}
          fallbackTransitionDuration={fallbackTransitionDuration}
          inputVideo={inputVideo}
          runtimeConfig={runtimeConfig}
          timeline={timelineMetadata.timeline}
        />
      </Sequence>

      <Sequence name="highlights" durationInFrames={timelineMetadata.totalDurationInFrames}>
        <HighlightsLayer highlights={sanitizedHighlights} fps={fps} theme={highlightTheme} />
      </Sequence>

      <Sequence name="sfx" durationInFrames={timelineMetadata.totalDurationInFrames}>
        <SfxLayer
          highlights={sanitizedHighlights}
          fps={fps}
          timeline={timelineMetadata.timeline}
          audioConfig={runtimeConfig.audio}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
