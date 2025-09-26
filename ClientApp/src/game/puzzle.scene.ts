import Phaser from 'phaser';
import { PuzzleConfig, PuzzlePoint } from '../app/shared/puzzle-config.model';

type SceneData = {
  config: PuzzleConfig;
  emitter: Phaser.Events.EventEmitter;
};

type PieceRuntime = {
  id: string;
  target: Phaser.Math.Vector2;
  shape: Phaser.GameObjects.Polygon;
  placed: boolean;
};

const COLORS = [
  0xffb400,
  0xff7b54,
  0xff6fb7,
  0xc084f5,
  0x61c0bf,
  0xffd166,
  0x3dccc7,
  0xf55f6a,
  0x4f9dff,
  0x8ddfcb
];

export class PuzzleScene extends Phaser.Scene {
  private config?: PuzzleConfig;
  private emitter?: Phaser.Events.EventEmitter;
  private pieces: PieceRuntime[] = [];
  private placedCount = 0;
  private startTime = 0;

  constructor() {
    super('PuzzleScene');
  }

  init(data: SceneData): void {
    this.config = data.config;
    this.emitter = data.emitter;
  }

  create(): void {
    if (!this.config) {
      throw new Error('Puzzle configuration missing.');
    }

    this.pieces = [];
    this.placedCount = 0;
    this.cameras.main.setBackgroundColor('#0b1627');

    this.drawGuide();
    this.spawnPieces();
    this.setupDragHandlers();

    this.add.text(this.scale.width * 0.5, this.scale.height - 28, 'Snap pieces inside the glowing outline', {
      color: "#b7c7ff",
      fontSize: "20px",
      fontFamily: "Segoe UI, Roboto, sans-serif"
    }).setOrigin(0.5, 0.5);

    this.startTime = this.time.now;
    this.emitter?.emit('puzzle-reset');
  }

  private drawGuide(): void {
    const outlinePoints = this.config!.outline.map((point) => this.toCanvasPoint(point));
    const guide = this.add.graphics();
    guide.fillStyle(0xffffff, 0.08);
    guide.lineStyle(2, 0xffffff, 0.35);
    guide.beginPath();
    guide.moveTo(outlinePoints[0].x, outlinePoints[0].y);
    for (let i = 1; i < outlinePoints.length; i++) {
      guide.lineTo(outlinePoints[i].x, outlinePoints[i].y);
    }
    guide.closePath();
    guide.fillPath();
    guide.strokePath();
    guide.setDepth(-10);
  }

  private spawnPieces(): void {
    const config = this.config!;
    const center = new Phaser.Math.Vector2(this.scale.width * 0.5, this.scale.height * 0.5);
    const scatterRadius = Math.min(this.scale.width, this.scale.height) * 0.45;

    config.pieces.forEach((piece, index) => {
      const actualPoints = piece.points.map((pt) => this.toCanvasPoint(pt));
      const centroid = this.computeCentroid(actualPoints);
      const relative = actualPoints.map((pt) => new Phaser.Math.Vector2(pt.x - centroid.x, pt.y - centroid.y));

      const coords: number[] = [];
      relative.forEach((pt) => coords.push(pt.x, pt.y));

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = scatterRadius + Phaser.Math.Between(40, 120);
      const start = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(distance).add(center);

      const shape = this.add.polygon(start.x, start.y, coords, COLORS[index % COLORS.length], 0.95);
      shape.setStrokeStyle(2, 0x0b1d2f, 0.9);
      shape.setData('pieceIndex', this.pieces.length);
      shape.setInteractive(
        new Phaser.Geom.Polygon(relative.map((pt) => new Phaser.Geom.Point(pt.x, pt.y))),
        Phaser.Geom.Polygon.Contains
      );
      shape.input!.cursor = 'grab';

      shape.on('pointerover', () => {
        if (!shape.input?.enabled) {
          return;
        }
        shape.setAlpha(1);
      });

      shape.on('pointerout', () => {
        if (!shape.input?.enabled) {
          return;
        }
        shape.setAlpha(0.95);
      });

      this.input.setDraggable(shape);

      this.pieces.push({
        id: piece.id,
        target: centroid,
        shape,
        placed: false
      });
    });
  }

  private setupDragHandlers(): void {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece || piece.placed) {
        return;
      }

      piece.shape.setDepth(50 + index);
      piece.shape.input!.cursor = 'grabbing';
    });

    this.input.on('drag', (_pointer, gameObject, dragX: number, dragY: number) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece || piece.placed) {
        return;
      }

      piece.shape.setPosition(dragX, dragY);
    });

    this.input.on('dragend', (_pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece || piece.placed) {
        return;
      }

      piece.shape.input!.cursor = 'grab';
      const distance = Phaser.Math.Distance.Between(piece.shape.x, piece.shape.y, piece.target.x, piece.target.y);
      const snapThreshold = Math.max(this.scale.width, this.scale.height) * 0.03;

      if (distance <= snapThreshold) {
        this.lockPiece(piece);
      }
    });
  }

  private lockPiece(piece: PieceRuntime): void {
    piece.placed = true;
    piece.shape.setPosition(piece.target.x, piece.target.y);
    piece.shape.setDepth(10);
    piece.shape.disableInteractive();
    this.tweens.add({
      targets: piece.shape,
      scale: 1.02,
      yoyo: true,
      duration: 150,
      ease: Phaser.Math.Easing.Sine.Out
    });

    this.placedCount += 1;

    if (this.placedCount === this.pieces.length) {
      const totalTime = (this.time.now - this.startTime) / 1000;
      this.emitter?.emit('puzzle-complete', { seconds: totalTime });
      this.showCompletionBanner(totalTime);
    }
  }

  private showCompletionBanner(totalSeconds: number): void {
    const banner = this.add.rectangle(this.scale.width * 0.5, 72, 480, 96, 0x183d2f, 0.82);
    banner.setStrokeStyle(2, 0x8ddfcb, 0.9);

    const message = this.add.text(this.scale.width * 0.5, 72, `Star restored in ${totalSeconds.toFixed(1)}s`, {
      color: '#e3fff5',
      fontSize: '30px',
      fontFamily: 'Segoe UI, Roboto, sans-serif'
    });
    message.setOrigin(0.5, 0.5);
  }

  private toCanvasPoint(point: PuzzlePoint): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(point.x * this.scale.width, point.y * this.scale.height);
  }

  private computeCentroid(points: Phaser.Math.Vector2[]): Phaser.Math.Vector2 {
    if (points.length === 0) {
      return new Phaser.Math.Vector2(0, 0);
    }

    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const cross = current.x * next.y - next.x * current.y;
      area += cross;
      cx += (current.x + next.x) * cross;
      cy += (current.y + next.y) * cross;
    }

    if (Math.abs(area) < 1e-6) {
      const fallback = points.reduce((acc, pt) => acc.add(pt), new Phaser.Math.Vector2(0, 0));
      return fallback.scale(1 / points.length);
    }

    area *= 0.5;
    const factor = 1 / (6 * area);
    return new Phaser.Math.Vector2(cx * factor, cy * factor);
  }
}
