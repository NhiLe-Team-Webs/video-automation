import {Audio, Sequence, staticFile} from 'remotion';
import type {HighlightPlan} from '../types';

interface SfxLayerProps {
  highlights: HighlightPlan[];
  fps: number;
}

export const SfxLayer: React.FC<SfxLayerProps> = ({highlights, fps}) => {
  return (
    <>
      {highlights
        .filter((highlight) => highlight.sfx)
        .map((highlight) => {
          const from = Math.round(highlight.start * fps);
          const duration = Math.max(1, Math.round(highlight.duration * fps));
          const volume = highlight.volume ?? 0.7;
          const src = staticFile(`sfx/${highlight.sfx}`);
          return (
            <Sequence key={`sfx-${highlight.id}`} from={from} durationInFrames={duration} name={`sfx-${highlight.id}`}>
              <Audio src={src} volume={volume} />
            </Sequence>
          );
        })}
    </>
  );
};
