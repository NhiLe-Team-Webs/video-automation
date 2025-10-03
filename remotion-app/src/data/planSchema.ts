import {z} from 'zod';
import type {
  CameraMovement,
  HighlightPlan,
  HighlightPosition,
  HighlightType,
  Plan,
  SegmentPlan,
  TransitionDirection,
  TransitionPlan,
  TransitionType,
} from '../types';

const transitionTypeSchema: z.ZodType<TransitionType> = z.enum([
  'cut',
  'fadeCamera',
  'slideWhoosh',
]);

const transitionDirectionSchema: z.ZodType<TransitionDirection> = z.enum([
  'left',
  'right',
  'up',
  'down',
]);

const transitionPlanSchema: z.ZodType<TransitionPlan> = z.object({
  type: transitionTypeSchema,
  duration: z.number().positive().optional(),
  direction: transitionDirectionSchema.optional(),
  sfx: z.string().optional(),
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
    label: z.string().optional(),
    title: z.string().optional(),
    playbackRate: z.number().positive().optional(),
    cameraMovement: cameraMovementSchema.optional(),
    silenceAfter: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .transform((segment) => ({
    ...segment,
    kind: segment.kind ?? 'normal',
  }));

const highlightTypeSchema: z.ZodType<HighlightType> = z
  .enum(['typewriter', 'noteBox', 'sectionTitle', 'icon'])
  .catch('noteBox');

const highlightPositionSchema: z.ZodType<HighlightPosition> = z
  .enum(['top', 'center', 'bottom'])
  .catch('center');

const highlightPlanSchema: z.ZodType<HighlightPlan> = z
  .object({
    id: z.string(),
    type: highlightTypeSchema.optional(),
    text: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    badge: z.string().optional(),
    name: z.string().optional(),
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
    animation: z.string().optional(),
    variant: z.string().optional(),
    volume: z.number().min(0).max(1).optional(),
  })
  .transform((highlight) => ({
    ...highlight,
    type: highlight.type ?? 'noteBox',
  }));

const planSchema: z.ZodType<Plan> = z.object({
  segments: z.array(segmentPlanSchema),
  highlights: z.array(highlightPlanSchema),
});

export type PlanSchema = typeof planSchema;

export const parsePlan = (data: unknown): Plan => planSchema.parse(data);

export const planExample: Plan = {
  segments: [
    {
      id: 'intro',
      sourceStart: 0,
      duration: 18,
      transitionOut: {type: 'crossfade', duration: 1},
      cameraMovement: 'zoomIn',
    },
    {
      id: 'main-1',
      sourceStart: 30,
      duration: 32,
      transitionIn: {type: 'crossfade', duration: 1},
      transitionOut: {type: 'slide', duration: 0.75, direction: 'left'},
      cameraMovement: 'zoomOut',
    },
    {
      id: 'main-2',
      sourceStart: 90,
      duration: 20,
      transitionIn: {type: 'slide', duration: 0.75, direction: 'right'},
      cameraMovement: 'zoomIn',
    },
  ],
  highlights: [
    {
      id: 'hook',
      text: 'Tăng gấp đôi hiệu suất với workflow tự động hoá.',
      start: 4.5,
      duration: 4,
      position: 'center',
      animation: 'fade',
      variant: 'blurred',
      sfx: 'ui/pop.mp3',
    },
    {
      id: 'stat',
      text: '48 giờ sản xuất video chỉ còn 6 giờ.',
      start: 22,
      duration: 4.5,
      position: 'bottom',
      animation: 'slide',
      variant: 'brand',
      sfx: 'whoosh/whoosh.mp3',
    },
    {
      id: 'quote',
      text: '"Khách hàng yêu thích trải nghiệm cá nhân hoá từng phút."',
      start: 39,
      duration: 5,
      position: 'top',
      animation: 'zoom',
      variant: 'cutaway',
      sfx: 'emotion/applause.mp3',
    },
    {
      id: 'cta',
      text: 'Đăng ký demo ngay hôm nay',
      start: 68,
      duration: 5,
      position: 'center',
      animation: 'typewriter',
      variant: 'typewriter',
      sfx: 'tech/notification.mp3',
    },
  ],
};

export default planSchema;
