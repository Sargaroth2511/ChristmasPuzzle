import Phaser from 'phaser';

export type SceneData = {
  emitter?: Phaser.Events.EventEmitter;
  showDebug?: boolean;
  useGlassStyle?: boolean;
};

export type PuzzlePoint = {
  x: number;
  y: number;
};

export type PuzzlePiece = {
  id: string;
  points: PuzzlePoint[];
  anchor: PuzzlePoint;
  fillColor: number;
  fillAlpha: number;
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
};

export type PuzzleBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type PuzzleConfig = {
  outline: PuzzlePoint[];
  outlineStyle?: SvgStyleAttributes;
  pieces: PuzzlePiece[];
  bounds: PuzzleBounds;
};

export type SvgStyleAttributes = {
  fillColor?: number;
  fillAlpha?: number;
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
};

export type PieceStyling = {
  fillColor: number;
  fillAlpha: number;
  strokeColor: number;
  strokeAlpha: number;
  strokeWidth: number;
};
