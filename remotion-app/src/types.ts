export type TransitionType = 'cut' | 'crossfade' | 'slide';

export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface TransitionPlan {
  type: TransitionType;
  duration?: number;
  direction?: TransitionDirection;
}

export interface SegmentPlan {
  id: string;
  sourceStart: number;
  duration: number;
  transitionIn?: TransitionPlan;
  transitionOut?: TransitionPlan;
  label?: string;
  playbackRate?: number;
}

export type HighlightPosition = 'top' | 'center' | 'bottom';

export type HighlightAnimation = 'fade' | 'zoom' | 'slide';

export interface HighlightPlan {
  id: string;
  text: string;
  start: number;
  duration: number;
  position?: HighlightPosition;
  animation?: HighlightAnimation;
  sfx?: string;
  volume?: number;
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
