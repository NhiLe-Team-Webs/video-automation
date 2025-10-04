import type {CalculateMetadataFunction} from 'remotion';
import {Composition, staticFile} from 'remotion';
import {FinalComposition} from './components/FinalComposition';
import {buildTimelineMetadata} from './components/VideoTimeline';
import {
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

type PathModuleWithDefault = typeof import('path') & {
  default?: typeof import('path');
};

const stripPublicPrefix = (value: string): string =>
  value.replace(/^[/\\]+/, '').replace(/^public[/\\]+/i, '');

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const resolveBrowserPlanUrl = (planPath: string): string => {
  if (isHttpUrl(planPath)) {
    return planPath;
  }

  const normalized = stripPublicPrefix(planPath);
  return staticFile(normalized);
};

const loadPlanFileContents = async (planPath: string): Promise<string> => {
  if (typeof window === 'undefined') {
    if (isHttpUrl(planPath)) {
      const response = await fetch(planPath);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch plan from ${planPath}: ${response.status} ${response.statusText}`
        );
      }

      return response.text();
    }

    const fsModule = (await import(
      /* webpackIgnore: true */ 'fs/promises'
    )) as typeof import('fs/promises');
    const pathModuleRaw = (await import(
      /* webpackIgnore: true */ 'path'
    )) as PathModuleWithDefault;
    const pathModule = pathModuleRaw.default ?? pathModuleRaw;
    const sanitizedRelative = stripPublicPrefix(planPath);
    const absolutePlanPath = pathModule.isAbsolute(planPath)
      ? planPath
      : pathModule.join(process.cwd(), 'public', sanitizedRelative);

    return fsModule.readFile(absolutePlanPath, 'utf-8');
  }

  const response = await fetch(resolveBrowserPlanUrl(planPath), {
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch plan from ${planPath}: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
};

const loadPlanFromDisk = async (planPath: string): Promise<Plan> => {
  const fileContents = await loadPlanFileContents(planPath);
  const parsed = JSON.parse(fileContents) as unknown;
  return parsePlan(parsed);
};

const loadActivePlan = async (
  props: FinalCompositionProps
): Promise<Plan> => {
  if (props.plan) {
    return props.plan;
  }

  if (!props.planPath) {
    throw new Error(
      'No planPath provided. Supply a plan object or set planPath to a valid JSON file.'
    );
  }

  try {
    return await loadPlanFromDisk(props.planPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load plan from ${props.planPath}: ${message}`);
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
