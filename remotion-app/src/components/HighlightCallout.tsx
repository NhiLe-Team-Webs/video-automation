import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {HighlightPlan, HighlightTheme} from '../types';
import {renderHighlightVariant} from './TextHighlightVariants';

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
  const {fps, width, height} = useVideoConfig();

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

  const animation = highlight.animation ?? 'fade';
  const content = renderHighlightVariant({
    highlight,
    theme,
    appear,
    exit,
    animation,
    variant: highlight.variant,
    width,
    height,
  });

  return content ? <>{content}</> : null;
};
