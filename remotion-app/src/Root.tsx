import type {CalculateMetadataFunction} from 'remotion';
import {Composition} from 'remotion';
import {FinalComposition} from './components/FinalComposition';
import {buildTimelineMetadata} from './components/VideoTimeline';
import {
  DEFAULT_DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from './config';
import {parsePlan} from './data/planSchema';
import type {FinalCompositionProps, Plan} from './types';

const DEFAULT_COMPOSITION_PROPS: FinalCompositionProps = {
  plan: null,
  planPath: 'input/plan.json',
  inputVideo: 'input/input.mp4',
  fallbackTransitionDuration: 0.75,
  highlightTheme: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
    fontFamily: 'Inter, sans-serif',
  },
  config: {},
};

const loadPlanFromDisk = async (planPath: string): Promise<Plan> => {
  const [{readFile}, pathModule] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
  ]);

  const absolutePlanPath = pathModule.isAbsolute(planPath)
    ? planPath
    : pathModule.join(process.cwd(), 'public', planPath);

  const fileContents = await readFile(absolutePlanPath, 'utf-8');
  const parsed = JSON.parse(fileContents) as unknown;
  return parsePlan(parsed);
};

const loadActivePlan = async (
  props: FinalCompositionProps
): Promise<Plan | null> => {
  if (props.plan) {
    return props.plan;
  }

  if (!props.planPath) {
    return null;
  }

  try {
    return await loadPlanFromDisk(props.planPath);
  } catch (err) {
    console.warn(`Failed to load plan from ${props.planPath}`, err);
    return null;
  }
};

const calculateMetadata: CalculateMetadataFunction<FinalCompositionProps> = async ({
  props,
}) => {
  const mergedProps: FinalCompositionProps = {
    ...DEFAULT_COMPOSITION_PROPS,
    ...props,
    highlightTheme: {
      ...DEFAULT_COMPOSITION_PROPS.highlightTheme,
      ...(props.highlightTheme ?? {}),
    },
  };

  const fallbackTransitionDuration =
    mergedProps.fallbackTransitionDuration ??
    DEFAULT_COMPOSITION_PROPS.fallbackTransitionDuration ??
    0.75;

  const plan = await loadActivePlan(mergedProps);

  if (!plan) {
    return {
      durationInFrames: DEFAULT_DURATION_IN_FRAMES,
    };
  }

  const {totalDurationInFrames} = buildTimelineMetadata(
    plan.segments,
    VIDEO_FPS,
    fallbackTransitionDuration
  );

  return {
    durationInFrames: Math.max(1, totalDurationInFrames),
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FinalVideo"
      component={FinalComposition}
      calculateMetadata={calculateMetadata}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      defaultProps={DEFAULT_COMPOSITION_PROPS}
    />
  );
};
