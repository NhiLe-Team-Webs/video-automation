import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {HighlightAnimation, HighlightPlan, HighlightPosition, HighlightTheme} from '../types';

const POSITION_STYLES: Record<HighlightPosition, CSSProperties> = {
  top: {justifyContent: 'flex-start', paddingTop: 120},
  center: {justifyContent: 'center'},
  bottom: {justifyContent: 'flex-end', paddingBottom: 120},
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const animationTransform = (
  animation: HighlightAnimation,
  appear: number,
  exit: number,
  theme: HighlightTheme | undefined
): CSSProperties => {
  const appearProgress = clamp01(appear);
  const exitProgress = clamp01(exit);
  const exitNormalized = 1 - exitProgress;
  const accent = theme?.accentColor ?? '#ffcf5c';

  if (animation === 'zoom') {
    const scale = interpolate(appearProgress, [0, 1], [0.82, 1.02], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const disappearScale = 1 - exitNormalized * 0.12;
    return {transform: `scale(${scale * disappearScale})`};
  }

  if (animation === 'slide') {
    const enterTranslate = interpolate(appearProgress, [0, 1], [50, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const exitTranslate = interpolate(exitNormalized, [0, 1], [0, -60], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {transform: `translateY(${enterTranslate + exitTranslate}px)`};
  }

  if (animation === 'bounce') {
    const bounce = Math.sin(appearProgress * Math.PI);
    const lift = -bounce * 32 * exitProgress;
    const scale = 1 + bounce * 0.18;
    const settleScale = 1 - exitNormalized * 0.15;
    return {
      transform: `translateY(${lift}px) scale(${scale * settleScale})`,
      filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.25)) drop-shadow(0 0 26px ${accent})`,
    };
  }

  if (animation === 'float') {
    const driftX = Math.sin(appearProgress * Math.PI * 1.5) * 18 * exitProgress;
    const driftY = -interpolate(appearProgress, [0, 1], [0, 48], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) * exitProgress;
    const shimmer = 1 + Math.sin((appearProgress + exitNormalized) * Math.PI) * 0.05;
    return {
      transform: `translate(${driftX}px, ${driftY}px) scale(${shimmer})`,
      filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.25)) drop-shadow(0 0 32px ${accent}) saturate(${1 + appearProgress * 0.2})`,
    };
  }

  if (animation === 'flip') {
    const rotate = interpolate(appearProgress, [0, 1], [-80, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const exitRotate = interpolate(exitNormalized, [0, 1], [0, 50], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const scale = 1 - exitNormalized * 0.1;
    return {
      transform: `perspective(1400px) rotateX(${rotate + exitRotate}deg) scale(${scale})`,
      transformStyle: 'preserve-3d',
    };
  }

  return {};
};

export interface HighlightCalloutProps {
  highlight: HighlightPlan;
  durationInFrames: number;
  theme?: HighlightTheme;
}

export const HighlightCallout: React.FC<HighlightCalloutProps> = ({
  highlight,
  durationInFrames,
  theme,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const appearFrames = Math.max(4, Math.round(fps * 0.3));
  const exitFrames = Math.max(4, Math.round(fps * 0.25));

  const appear = interpolate(frame, [0, appearFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const opacity = Math.min(appear, exit);
  const animation = highlight.animation ?? 'fade';
  const transformStyle = animationTransform(animation, appear, exit, theme);

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme?.textColor ?? '#fff',
    fontFamily: theme?.fontFamily ?? 'Inter, sans-serif',
  };

  const bubbleStyle: CSSProperties = {
    background: theme?.backgroundColor ?? 'rgba(0, 0, 0, 0.65)',
    borderLeft: `6px solid ${theme?.accentColor ?? '#ffcf5c'}`,
    padding: '32px 48px',
    borderRadius: 24,
    fontSize: 52,
    lineHeight: 1.2,
    maxWidth: '70%',
    boxShadow: '0 22px 60px rgba(0, 0, 0, 0.35), 0 0 38px rgba(255, 207, 92, 0.45)',
    opacity,
    ...transformStyle,
    transformOrigin: 'center',
    backfaceVisibility: 'hidden',
  };

  return (
    <div style={{...POSITION_STYLES[highlight.position ?? 'center'], ...containerStyle}}>
      <div style={bubbleStyle}>{highlight.text}</div>
    </div>
  );
};
