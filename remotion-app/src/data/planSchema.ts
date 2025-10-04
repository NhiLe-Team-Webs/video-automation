import {z} from 'zod';
import type {
  CameraMovement,
  HighlightPlan,
  HighlightPosition,
  HighlightType,
  IconAnimation,
  Plan,
  SegmentPlan,
  TransitionDirection,
  TransitionPlan,
  TransitionType,
} from '../types';

const normalizeTransitionToken = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/[\s_-]+/g, '').toLowerCase();
};

const transitionTypeSchema: z.ZodType<TransitionType> = z
  .preprocess(normalizeTransitionToken, z.enum([
    'cut',
    'fadecamera',
    'slidewhoosh',
    'crossfade',
    'slide',
    'zoom',
    'scale',
    'rotate',
    'blur',
  ]))
  .transform((value): TransitionType => {
    switch (value) {
      case 'cut':
        return 'cut';
      case 'slidewhoosh':
      case 'slide':
        return 'slideWhoosh';
      default:
        return 'fadeCamera';
    }
  });

const transitionDirectionSchema: z.ZodType<TransitionDirection> = z.enum([
  'left',
  'right',
  'up',
  'down',
]);

const transitionPlanSchema: z.ZodType<TransitionPlan> = z
  .object({
    type: transitionTypeSchema,
    duration: z.number().positive().optional(),
    direction: transitionDirectionSchema.optional(),
    sfx: z.string().optional(),
  })
  .transform((transition) => {
    if (transition.type !== 'slideWhoosh') {
      const {direction, ...rest} = transition;
      return rest;
    }
    return transition;
  });

const cameraMovementSchema: z.ZodType<CameraMovement> = z.enum(['static', 'zoomIn', 'zoomOut']);

const segmentKindSchema: z.ZodType<SegmentPlan['kind']> = z.enum(['normal', 'broll']).catch('normal');

const segmentPlanSchema: z.ZodType<SegmentPlan> = z
  .object({
    id: z.string(),
    kind: segmentKindSchema.optional(),
    sourceStart: z.number().min(0).optional(),
    duration: z.number().positive(),
    transitionIn: transitionPlanSchema.optional(),
    transitionOut: transitionPlanSchema.optional(),
    transition: transitionPlanSchema.optional(),
    label: z.string().optional(),
    title: z.string().optional(),
    playbackRate: z.number().positive().optional(),
    cameraMovement: cameraMovementSchema.optional(),
    silenceAfter: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .transform((segment) => {
    const {transition, ...rest} = segment;
    const resolvedTransitionOut = rest.transitionOut ?? transition;

    return {
      ...rest,
      transitionOut: resolvedTransitionOut ?? undefined,
      kind: rest.kind ?? 'normal',
    } as SegmentPlan;
  });

const highlightTypeSchema: z.ZodType<HighlightType> = z
  .enum(['typewriter', 'noteBox', 'sectionTitle', 'icon'])
  .catch('noteBox');

const highlightPositionSchema: z.ZodType<HighlightPosition> = z
  .enum(['top', 'center', 'bottom'])
  .catch('center');

const iconAnimationSchema: z.ZodType<IconAnimation | undefined> = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
      case 'float':
      case 'pulse':
      case 'spin':
      case 'pop':
        return normalized as IconAnimation;
      default:
        return undefined;
    }
  });

const highlightPlanSchema: z.ZodType<HighlightPlan> = z
  .object({
    id: z.string(),
    type: highlightTypeSchema.optional(),
    text: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    badge: z.string().optional(),
    name: z.string().optional(),
    icon: z.string().optional(),
    asset: z.string().optional(),
    start: z.number().min(0),
    duration: z.number().positive(),
    position: highlightPositionSchema.optional(),
    side: z.enum(['bottom', 'left', 'right', 'top']).optional(),
    bg: z.string().optional(),
    radius: z.number().optional(),
    sfx: z.string().optional(),
    gain: z.number().optional(),
    ducking: z.boolean().optional(),
    animation: iconAnimationSchema,
    variant: z.string().optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    iconColor: z.string().optional(),
    volume: z.number().min(0).max(1).optional(),
  })
  .transform((highlight) => ({
    ...highlight,
    type: highlight.type ?? 'noteBox',
  }));

const planSchema: z.ZodType<Plan> = z
  .object({
    segments: z.array(segmentPlanSchema),
    highlights: z.array(highlightPlanSchema).default([]),
    meta: z.record(z.unknown()).optional(),
  })
  .transform((plan) => ({
    ...plan,
    highlights: plan.highlights ?? [],
  }));

export type PlanSchema = typeof planSchema;

export const parsePlan = (data: unknown): Plan => planSchema.parse(data);

export const planExample: Plan = {
  segments: [
    {
      id: 'intro',
      kind: 'normal',
      sourceStart: 0,
      duration: 18,
      cameraMovement: 'zoomIn',
      transitionOut: {type: 'fadeCamera', duration: 1, sfx: 'ui/camera.mp3'},
      silenceAfter: true,
    },
    {
      id: 'main-1',
      kind: 'normal',
      sourceStart: 30,
      duration: 32,
      transitionIn: {type: 'fadeCamera', duration: 0.8},
      transitionOut: {type: 'slideWhoosh', duration: 0.75, direction: 'left', sfx: 'ui/whoosh.mp3'},
      cameraMovement: 'zoomOut',
      silenceAfter: true,
    },
    {
      id: 'broll-1',
      kind: 'broll',
      duration: 6,
      title: 'AI Robot (download later)',
      transitionIn: {type: 'fadeCamera', duration: 0.6},
      transitionOut: {type: 'slideWhoosh', duration: 0.7, direction: 'right'},
      silenceAfter: true,
      metadata: {
        style: 'roundedFrame',
        subtitle: 'Placeholder for future footage',
      },
    },
    {
      id: 'main-2',
      kind: 'normal',
      sourceStart: 90,
      duration: 20,
      transitionIn: {type: 'slideWhoosh', duration: 0.7, direction: 'right'},
      cameraMovement: 'zoomIn',
      silenceAfter: false,
    },
  ],
  highlights: [
    {
      id: 'hook',
      type: 'typewriter',
      text: 'Tăng gấp đôi hiệu suất với workflow tự động hoá.',
      start: 4.5,
      duration: 4,
      position: 'center',
      sfx: 'ui/type.mp3',
    },
    {
      id: 'stat',
      type: 'noteBox',
      text: '48 giờ sản xuất video chỉ còn 6 giờ.',
      start: 22,
      duration: 4.5,
      position: 'bottom',
      side: 'bottom',
      sfx: 'ui/click-soft.mp3',
    },
    {
      id: 'section',
      type: 'sectionTitle',
      title: 'Chiến lược #2',
      subtitle: 'Lên lịch nội dung theo đề xuất AI',
      start: 60,
      duration: 3.5,
      badge: 'Chapter',
    },
    {
      id: 'icon-rocket',
      type: 'icon',
      name: 'Chế độ tăng tốc',
      icon: 'launch',
      start: 86.2,
      duration: 1.6,
      animation: 'pop',
      accentColor: '#f97316',
      backgroundColor: 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(15,23,42,0.92) 100%)',
    },
    {
      id: 'icon-ai',
      type: 'icon',
      name: 'AI trợ lực',
      icon: 'fa:robot',
      start: 92,
      duration: 1.8,
      animation: 'spin',
      accentColor: '#38bdf8',
      backgroundColor: 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(17,24,39,0.94) 100%)',
    },
  ],
  meta: {
    source_srt: 'input/sample.srt',
  },
};

export default planSchema;
