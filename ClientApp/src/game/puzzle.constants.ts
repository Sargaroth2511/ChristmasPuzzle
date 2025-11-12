export const STAG_BASE_COLOR = 0xafb2b6;
export const PIECE_STROKE_WIDTH = 2.5;
export const PIECE_HOVER_STROKE_WIDTH = 3.5;
export const PIECE_HOVER_STROKE_RATIO = PIECE_HOVER_STROKE_WIDTH / PIECE_STROKE_WIDTH;
export const SNAP_ANIMATION_DURATION = 180;
export const SNAP_BASE_FACTOR = 0.09;

export const INTRO_HOLD_DURATION = 1200;
export const EXPLOSION_SHIVER_DURATION = 2000;
export const EXPLOSION_SHIVER_AMPLITUDE = { min: 0.6, max: 2.2 } as const;
export const EXPLOSION_SHIVER_INTERVAL = { min: 220, max: 320 } as const;
export const EXPLOSION_STAGGER = 5;
export const EXPLOSION_GRAVITY = 2200;
export const EXPLOSION_TRAVEL_TIME = { min: 0.72, max: 0.95 } as const;
export const EXPLOSION_RADIAL_BOOST = { min: 860, max: 1600 } as const;
export const EXPLOSION_SPIN_RANGE = { min: -4.4, max: 4.4 } as const;
export const EXPLOSION_BOUNCE_DAMPING = 0.36;
export const EXPLOSION_GROUND_FRICTION = 0.22;
export const EXPLOSION_SPIN_DAMPING = 0.7;
export const EXPLOSION_MIN_REST_SPEED = 20;
export const EXPLOSION_REST_DELAY = 120;
export const EXPLOSION_WALL_MARGIN = 24;
export const EXPLOSION_WALL_DAMPING = 0.42;

export const SVG_SAMPLING_MAX_STEP = 0.6;
export const SVG_SAMPLING_MIN_STEPS = 256;
export const SVG_SAMPLING_MAX_STEPS = 4096;

export const DEFAULT_FILL_ALPHA = 0.2;
export const DEFAULT_STROKE_ALPHA = 0.9;

export const SNAP_TOLERANCE_LIMITS = { min: 18, max: 120 } as const;

export const GUIDE_FILL_STYLE = { color: 0xffffff, alpha: 0 } as const;
export const GUIDE_STROKE_STYLE = { width: 0.2, color: 0x000000, alpha: 0.95 } as const;

export const HOVER_STROKE_DELTA = 0.6;

export const PLACEMENT_SHIMMER_DURATION = 1200;
export const PLACEMENT_SHIMMER_BAND_WIDTH_RATIO = 1.7;
export const PLACEMENT_SHIMMER_EDGE_ALPHA = 1;
export const PLACEMENT_SHIMMER_LIGHT_VECTOR = { x: -0.6, y: -0.7, z: 0.4 } as const;
export const PLACEMENT_SHIMMER_SWEEP_VECTOR = { x: 0.6, y: 0.7 } as const;
export const PLACEMENT_SHIMMER_STROKE_MULTIPLIER = 4;

export const PUZZLE_SCALE_RATIO = 0.9;

export const DRAG_ACTIVE_SCALE = 1.05;
export const DRAG_SHADOW_OFFSET = { x: 10, y: 10 } as const;
export const DRAG_SHADOW_COLOR = 0x0a2014;
export const DRAG_SHADOW_ALPHA = 0.36;
export const DRAG_SHADOW_GLASS_COLOR = 0xffffff;
export const DRAG_SHADOW_GLASS_ALPHA = 0.62;

// Touch-specific drag offset (piece appears above and to the left of finger on mobile)
export const TOUCH_DRAG_OFFSET = { x: -50, y: -50 } as const; // Negative values move piece up and left from touch point

// Scene layout tuning
export const SCENE_FLOOR_BOTTOM_MARGIN = 20; // Pixels to keep free between the floor line and the bottom edge.
