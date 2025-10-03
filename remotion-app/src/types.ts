export type TransitionType =
  | 'cut'
  | 'crossfade'
  | 'slide'
  | 'zoom'
  | 'scale'
  | 'rotate'
  | 'blur';

export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface TransitionPlan {
  type: TransitionType;
  duration?: number;
  direction?: TransitionDirection;
  intensity?: number;
}

export type CameraMovement = 'static' | 'zoomIn' | 'zoomOut';

export interface SegmentPlan {
  id: string;
  sourceStart: number;
  duration: number;
  transitionIn?: TransitionPlan;
  transitionOut?: TransitionPlan;
  label?: string;
  playbackRate?: number;
  cameraMovement?: CameraMovement;
  metadata?: Record<string, unknown>;
}

export type HighlightPosition = 'top' | 'center' | 'bottom';

export type HighlightAnimation =
  | 'fade'
  | 'zoom'
  | 'slide'
  | 'bounce'
  | 'float'
  | 'flip'
  | 'typewriter';

export type HighlightVariant = 'callout' | 'blurred' | 'cutaway' | 'brand' | 'typewriter';

export interface HighlightPlan {
  id: string;
  text: string;
  start: number;
  duration: number;
  position?: HighlightPosition;
  animation?: HighlightAnimation;
  sfx?: string;
  volume?: number;
  variant?: HighlightVariant;
}

export interface Plan {
  segments: SegmentPlan[];
  highlights: HighlightPlan[];
}

export interface HighlightTheme {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export interface FinalCompositionProps {
  plan?: Plan | null;
  planPath?: string;
  inputVideo?: string;
  fallbackTransitionDuration?: number;
  highlightTheme?: HighlightTheme;
}
