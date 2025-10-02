export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;

const fallbackDurationSeconds = 15 * 60; // 15 minutes default cap
export const DEFAULT_DURATION_IN_FRAMES = VIDEO_FPS * fallbackDurationSeconds;
