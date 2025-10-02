import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {HighlightAnimation, HighlightPlan, HighlightPosition, HighlightTheme} from '../types';

const POSITION_STYLES: Record<HighlightPosition, CSSProperties> = {
  top: {justifyContent: 'flex-start', paddingTop: 120},
  center: {justifyContent: 'center'},
  bottom: {justifyContent: 'flex-end', paddingBottom: 120},
};

const animationTransform = (
  animation: HighlightAnimation,
  appear: number,
  exit: number,
  theme: HighlightTheme | undefined
): CSSProperties => {
  if (animation === 'zoom') {
    const scale = interpolate(appear, [0, 1], [0.85, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const disappearScale = interpolate(exit, [0, 1], [0.95, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {transform: `scale(${scale * disappearScale})`};
  }

  if (animation === 'slide') {
    const translate = interpolate(appear, [0, 1], [40, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const exitTranslate = interpolate(exit, [0, 1], [0, -40], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {transform: `translateY(${translate + exitTranslate}px)`};
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
    boxShadow: '0 22px 60px rgba(0, 0, 0, 0.35)',
    opacity,
    ...transformStyle,
  };

  return (
    <div style={{...POSITION_STYLES[highlight.position ?? 'center'], ...containerStyle}}>
      <div style={bubbleStyle}>{highlight.text}</div>
    </div>
  );
};
