// Delay, durations, and scaling for the cinematic zoom (milliseconds and target scale)
export const INITIAL_ZOOM_DELAY_MS = 1000;
export const INITIAL_ZOOM_DURATION_MS = 5000;
export const INITIAL_ZOOM_TARGET_SCALE = 1.45;

// Layer parallax multipliers determine how quickly each layer scales relative to the camera zoom
export const INITIAL_PARALLAX_RANGE = { near: 0.08, far: 0.68 } as const;

// Focus point offsets (pixels) relative to the canvas centre when zooming (tweak to reframe the stag)
export const INITIAL_CAMERA_FOCUS_OFFSET = { x: -150, y: 50 } as const;
