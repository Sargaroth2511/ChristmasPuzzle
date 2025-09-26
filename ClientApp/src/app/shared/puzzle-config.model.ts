export interface PuzzlePoint {
  x: number;
  y: number;
}

export interface PuzzlePiece {
  id: string;
  points: PuzzlePoint[];
  anchor: PuzzlePoint;
}

export interface PuzzleConfig {
  outline: PuzzlePoint[];
  pieces: PuzzlePiece[];
}
