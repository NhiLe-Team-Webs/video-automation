import {z} from 'zod';
import type {
  HighlightAnimation,
  HighlightPlan,
  HighlightPosition,
  Plan,
  SegmentPlan,
  TransitionDirection,
  TransitionPlan,
  TransitionType,
} from '../types';

const transitionTypeSchema: z.ZodType<TransitionType> = z.enum([
  'cut',
  'crossfade',
  'slide',
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
});

const segmentPlanSchema: z.ZodType<SegmentPlan> = z.object({
  id: z.string(),
  sourceStart: z.number().min(0),
  duration: z.number().positive(),
  transitionIn: transitionPlanSchema.optional(),
  transitionOut: transitionPlanSchema.optional(),
  label: z.string().optional(),
  playbackRate: z.number().positive().optional(),
});

const highlightAnimationSchema: z.ZodType<HighlightAnimation> = z.enum([
  'fade',
  'zoom',
  'slide',
]);

const highlightPositionSchema: z.ZodType<HighlightPosition> = z.enum([
  'top',
  'center',
  'bottom',
]);

const highlightPlanSchema: z.ZodType<HighlightPlan> = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().min(0),
  duration: z.number().positive(),
  position: highlightPositionSchema.optional(),
  animation: highlightAnimationSchema.optional(),
  sfx: z.string().optional(),
  volume: z.number().min(0).max(1).optional(),
});

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
      duration: 20,
      transitionOut: {type: 'crossfade', duration: 1},
    },
    {
      id: 'main-1',
      sourceStart: 30,
      duration: 45,
      transitionIn: {type: 'crossfade', duration: 1},
      transitionOut: {type: 'slide', duration: 0.75, direction: 'left'},
    },
    {
      id: 'main-2',
      sourceStart: 90,
      duration: 35,
      transitionIn: {type: 'slide', duration: 0.75, direction: 'right'},
    },
  ],
  highlights: [
    {
      id: 'hook',
      text: 'Điểm nhấn chính xuất hiện!',
      start: 5,
      duration: 4,
      position: 'center',
      animation: 'zoom',
      sfx: 'pop.mp3',
    },
    {
      id: 'stat',
      text: 'Số liệu quan trọng được giới thiệu.',
      start: 52,
      duration: 5,
      position: 'bottom',
      animation: 'slide',
      sfx: 'whoosh.wav',
    },
  ],
};

export default planSchema;
