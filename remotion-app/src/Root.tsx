import {Composition} from 'remotion';
import {FinalComposition} from './components/FinalComposition';
import {planExample} from './data/planSchema';
import {
  DEFAULT_DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from './config';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FinalVideo"
      component={FinalComposition}
      durationInFrames={DEFAULT_DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      defaultProps={{
        plan: planExample,
        planPath: 'plan.json',
        inputVideo: 'input.mp4',
        fallbackTransitionDuration: 0.75,
        highlightTheme: {
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          textColor: '#f8fafc',
          accentColor: '#38bdf8',
          fontFamily: 'Inter, sans-serif',
        },
      }}
    />
  );
};
