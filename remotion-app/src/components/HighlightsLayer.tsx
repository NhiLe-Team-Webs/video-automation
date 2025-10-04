import {AbsoluteFill, Sequence} from 'remotion';
import type {HighlightPlan, HighlightTheme} from '../types';
import {HighlightCallout} from './HighlightCallout';
import {IconEffect} from './IconEffect';

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
        const isIcon = (highlight.type ?? 'noteBox') === 'icon';
        return (
          <Sequence key={highlight.id} from={from} durationInFrames={duration} name={`highlight-${highlight.id}`}>
            {isIcon ? (
              <IconEffect highlight={highlight} durationInFrames={duration} theme={theme} />
            ) : (
              <HighlightCallout highlight={highlight} durationInFrames={duration} theme={theme} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
