import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {useMemo} from 'react';
import {usePlan} from '../hooks/usePlan';
import type {FinalCompositionProps, Plan} from '../types';
import {HighlightsLayer} from './HighlightsLayer';
import {SfxLayer} from './SfxLayer';
import {VideoTimeline, buildTimelineMetadata} from './VideoTimeline';

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
}> = ({plan, fallbackTransitionDuration, inputVideo}) => {
  const {fps} = useVideoConfig();
  return (
    <VideoTimeline
      plan={plan}
      fps={fps}
      fallbackTransitionDuration={fallbackTransitionDuration}
      inputVideo={inputVideo}
    />
  );
};

export const FinalComposition: React.FC<FinalCompositionProps> = ({
  plan,
  planPath = 'plan.json',
  inputVideo = 'input.mp4',
  fallbackTransitionDuration = DEFAULT_TRANSITION_SECONDS,
  highlightTheme,
}) => {
  const {fps} = useVideoConfig();
  const shouldLoadPlan = Boolean(planPath);
  const {plan: loadedPlan, status, error} = usePlan(planPath, {enabled: shouldLoadPlan});

  const activePlan = loadedPlan ?? plan ?? null;

  const metadata = useMemo(() => {
    if (!activePlan) {
      return {totalDurationInFrames: fps * 10};
    }
    const nextMetadata = buildTimelineMetadata(activePlan.segments, fps, fallbackTransitionDuration);
    return {
      totalDurationInFrames: Math.max(1, nextMetadata.totalDurationInFrames),
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
      <Sequence name="video" durationInFrames={metadata.totalDurationInFrames}>
        <PlanAwareTimeline
          plan={activePlan}
          fallbackTransitionDuration={fallbackTransitionDuration}
          inputVideo={inputVideo}
        />
      </Sequence>

      <Sequence name="highlights" durationInFrames={metadata.totalDurationInFrames}>
        <HighlightsLayer highlights={sanitizedHighlights} fps={fps} theme={highlightTheme} />
      </Sequence>

      <Sequence name="sfx" durationInFrames={metadata.totalDurationInFrames}>
        <SfxLayer highlights={sanitizedHighlights} fps={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};
