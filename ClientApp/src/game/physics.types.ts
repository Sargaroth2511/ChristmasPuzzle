/**
 * Simplified Physics Types for Puzzle Scene
 * This file adds physics mode toggling to the existing drag-and-drop puzzle
 */

export type PhysicsMode = 'none' | 'matter';

export type PhysicsOptions = {
  mode: PhysicsMode;
  enableGravity: boolean;
  gravityY: number;
  enableBounce: boolean;
  bounceValue: number;
  enableFriction: boolean;
  frictionValue: number;
};

export const DEFAULT_PHYSICS_OPTIONS: PhysicsOptions = {
  mode: 'none',
  enableGravity: false,
  gravityY: 300,
  enableBounce: true,
  bounceValue: 0.6,
  enableFriction: true,
  frictionValue: 0.1
};

export const MATTER_PHYSICS_OPTIONS: PhysicsOptions = {
  mode: 'matter',
  enableGravity: true,
  gravityY: 1,
  enableBounce: true,
  bounceValue: 0.4,
  enableFriction: true,
  frictionValue: 0.05
};
