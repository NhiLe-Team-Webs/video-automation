import {AbsoluteFill, Sequence} from 'remotion';
import type {HighlightPlan, HighlightTheme} from '../types';
import {HighlightCallout} from './HighlightCallout';

interface HighlightsLayerProps {
  highlights: HighlightPlan[];
  fps: number;
  theme?: HighlightTheme;
}

export const HighlightsLayer: React.FC<HighlightsLayerProps> = ({highlights, fps, theme}) => {
  return (
    <AbsoluteFill pointerEvents="none">
      {highlights.map((highlight) => {
        const from = Math.round(highlight.start * fps);
        const duration = Math.max(1, Math.round(highlight.duration * fps));
        return (
          <Sequence key={highlight.id} from={from} durationInFrames={duration} name={`highlight-${highlight.id}`}>
            <HighlightCallout highlight={highlight} durationInFrames={duration} theme={theme} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
