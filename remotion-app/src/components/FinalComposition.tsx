import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {useMemo} from 'react';
import {usePlan} from '../hooks/usePlan';
import type {FinalCompositionProps, Plan} from '../types';
import {BRAND, resolveRuntimeConfig} from '../config';
import {HighlightsLayer} from './HighlightsLayer';
import {SfxLayer} from './SfxLayer';
import {VideoTimeline, buildTimelineMetadata} from './VideoTimeline';
import type {TimelineSegment} from './timeline';

const DEFAULT_TRANSITION_SECONDS = 0.75;

const LoadingState: React.FC<{message: string}> = ({message}) => {
  return (
    <AbsoluteFill
      style={{
        background: BRAND.gradient,
        alignItems: 'center',
        justifyContent: 'center',
        color: BRAND.white,
        fontFamily: BRAND.fonts.heading,
        fontSize: 56,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
      }}
    >
      <div
        style={{
          padding: '2.4rem 3.6rem',
          borderRadius: '1rem',
          background: BRAND.overlays.glassBackground,
          border: `1px solid ${BRAND.overlays.glassBorder}`,
          backdropFilter: 'blur(22px)',
          boxShadow: '0 24px 80px rgba(12,12,12,0.4)',
          fontFamily: BRAND.fonts.body,
          fontSize: 32,
          letterSpacing: 0.5,
          textTransform: 'none',
        }}
      >
        {message}
      </div>
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
    <AbsoluteFill
      style={{
        background: 'linear-gradient(120deg, #FFFFFF 0%, #F2F2F2 30%, #0F0F0F 100%)',
        fontFamily: BRAND.fonts.body,
        color: BRAND.white,
      }}
    >
      <AbsoluteFill
        style={{
          background: BRAND.radialGlow,
          opacity: 0.45,
          mixBlendMode: 'multiply',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 80% 15%, rgba(200,16,46,0.28), transparent 65%)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill style={{padding: '72px 84px'}}>
        <AbsoluteFill
          style={{
            overflow: 'hidden',
            boxShadow: '0 32px 140px rgba(12,12,12,0.38)',
            backgroundColor: BRAND.charcoal,
            border: `1px solid ${BRAND.overlays.glassBorder}`,
          }}
        >
          <AbsoluteFill
            style={{
              background: BRAND.gradient,
              opacity: 0.78,
              mixBlendMode: 'soft-light',
              pointerEvents: 'none',
            }}
          />
          <AbsoluteFill
            style={{
              background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08), transparent 70%)',
              opacity: 0.55,
              pointerEvents: 'none',
            }}
          />

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
      </AbsoluteFill>

      <AbsoluteFill pointerEvents="none">
        <div
          style={{
            position: 'absolute',
            top: 42,
            right: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderRadius: '999px',
            background: BRAND.overlays.accentGradient,
            boxShadow: '0 18px 48px rgba(200,16,46,0.35)',
            border: `1px solid ${BRAND.overlays.glassBorder}`,
            textTransform: 'uppercase',
            letterSpacing: 2.4,
            fontFamily: BRAND.fonts.heading,
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              background: BRAND.white,
              clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
              opacity: 0.75,
            }}
          />
          <span style={{color: BRAND.white}}>Crown</span>
          <span style={{color: BRAND.lightGray}}>Mercado</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
