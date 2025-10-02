import {planExample} from './data/planSchema';
import {buildTimelineMetadata} from './components/VideoTimeline';

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;

const fallbackDurationSeconds = 15 * 60; // 15 minutes default cap

const sampleMetadata = buildTimelineMetadata(planExample.segments, VIDEO_FPS, 0.75);
const sampleDuration = Math.max(sampleMetadata.totalDurationInFrames, VIDEO_FPS * 60);

export const DEFAULT_DURATION_IN_FRAMES = Math.min(
  VIDEO_FPS * fallbackDurationSeconds,
  sampleDuration
);
