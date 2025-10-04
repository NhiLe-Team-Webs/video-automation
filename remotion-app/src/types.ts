export type TransitionType = 'cut' | 'fadeCamera' | 'slideWhoosh';

export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface TransitionPlan {
  type: TransitionType;
  duration?: number;
  direction?: TransitionDirection;
  sfx?: string;
}

export type SegmentKind = 'normal' | 'broll';

export type CameraMovement = 'static' | 'zoomIn' | 'zoomOut';

export interface SegmentPlan {
  id: string;
  kind?: SegmentKind;
  sourceStart?: number;
  duration: number;
  transitionIn?: TransitionPlan;
  transitionOut?: TransitionPlan;
  label?: string;
  title?: string;
  playbackRate?: number;
  cameraMovement?: CameraMovement;
  silenceAfter?: boolean;
  metadata?: Record<string, unknown>;
}

export type HighlightType = 'typewriter' | 'noteBox' | 'sectionTitle' | 'icon';

export type IconAnimation = 'float' | 'pulse' | 'spin' | 'pop';

export type HighlightPosition = 'top' | 'center' | 'bottom';

export interface HighlightPlan {
  id: string;
  type?: HighlightType;
  text?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  name?: string;
  icon?: string;
  asset?: string;
  start: number;
  duration: number;
  position?: HighlightPosition;
  side?: 'bottom' | 'left' | 'right' | 'top';
  bg?: string;
  radius?: number;
  sfx?: string;
  gain?: number;
  ducking?: boolean;
  accentColor?: string;
  backgroundColor?: string;
  iconColor?: string;
  animation?: IconAnimation;
  variant?: string;
  [key: string]: unknown;
}

export interface Plan {
  segments: SegmentPlan[];
  highlights: HighlightPlan[];
  meta?: Record<string, unknown>;
}

export interface HighlightTheme {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export interface CompositionConfigOverrides {
  minPauseMs?: number;
  audio?: Partial<{voiceDuckDb: number; sfxBaseGainDb: number}>;
  transitions?: Partial<{defaultFade: number}>;
  brand?: Partial<Record<string, string>>;
}

export interface FinalCompositionProps {
  plan?: Plan | null;
  planPath?: string;
  inputVideo?: string;
  fallbackTransitionDuration?: number;
  highlightTheme?: HighlightTheme;
  config?: CompositionConfigOverrides;
}
