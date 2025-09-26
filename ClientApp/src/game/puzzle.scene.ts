import Phaser from 'phaser';

type SceneData = {
  emitter?: Phaser.Events.EventEmitter;
};

type PuzzlePoint = {
  x: number;
  y: number;
};

type PuzzlePiece = {
  id: string;
  points: PuzzlePoint[];
  anchor: PuzzlePoint;
};

type PuzzleConfig = {
  outline: PuzzlePoint[];
  pieces: PuzzlePiece[];
  bounds: PuzzleBounds;
};

type PieceRuntime = {
  id: string;
  target: Phaser.Math.Vector2;
  shape: Phaser.GameObjects.Polygon;
  footprint: Phaser.Math.Vector2[];
  shapePoints: PuzzlePoint[];
};

type PuzzleBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
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
  private debugOverlay?: Phaser.GameObjects.Graphics;

  constructor() {
    super('PuzzleScene');
  }

  preload(): void {
    this.load.text('puzzle-svg', 'assets/pieces/Zeichnung.svg');
  }

  init(data: SceneData): void {
    this.emitter = data?.emitter;
  }

  create(): void {
    const svgText = this.cache.text.get('puzzle-svg');
    if (!svgText) {
      throw new Error('Puzzle SVG data missing.');
    }

    this.config = this.createConfigFromSvg(svgText);

    this.pieces = [];
    this.placedCount = 0;
    this.cameras.main.setBackgroundColor('#0b1627');

    this.drawGuide();
    this.spawnPieces();
    this.setupDragHandlers();

    this.add
      .text(this.scale.width * 0.5, this.scale.height - 28, 'Snap pieces inside the glowing outline', {
        color: '#b7c7ff',
        fontSize: '20px',
        fontFamily: 'Segoe UI, Roboto, sans-serif'
      })
      .setOrigin(0.5, 0.5);

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
    guide.setDepth(-20);
  }

  private spawnPieces(): void {
    const config = this.config!;
    const center = new Phaser.Math.Vector2(this.scale.width * 0.5, this.scale.height * 0.5);
    const scatterRadius = Math.min(this.scale.width, this.scale.height) * 0.45;

    config.pieces.forEach((piece, index) => {
      const actualPoints = piece.points.map((pt) => this.toCanvasPoint(pt));
      const anchor = this.toCanvasPoint(piece.anchor);
      const geometry = this.buildPieceGeometry(actualPoints, anchor);

      const minSeparation = Math.max(this.scale.width, this.scale.height) * 0.12;
      let attempts = 0;
      let start: Phaser.Math.Vector2;

      do {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.Between(scatterRadius * 0.6, scatterRadius);
        start = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(distance).add(center);
        start.x = Phaser.Math.Clamp(start.x, 48, this.scale.width - 48);
        start.y = Phaser.Math.Clamp(start.y, 48, this.scale.height - 48);
        attempts += 1;
      } while (
        attempts < 8 &&
        Phaser.Math.Distance.Between(start.x, start.y, geometry.target.x, geometry.target.y) < minSeparation
      );

      const shape = this.add.polygon(start.x, start.y, geometry.coords, COLORS[index % COLORS.length], 0.95);
      shape.setStrokeStyle(2, 0x0b1d2f, 0.9);
      shape.setData('pieceIndex', this.pieces.length);
      shape.setInteractive(
        new Phaser.Geom.Polygon(geometry.hitArea),
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
        target: geometry.target,
        shape,
        footprint: actualPoints,
        shapePoints: piece.points
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
      if (!piece) {
        return;
      }

      piece.shape.setDepth(50 + index);
      piece.shape.input!.cursor = 'grabbing';
      this.showDebugOutline(piece);
    });

    this.input.on('drag', (_pointer, gameObject, dragX: number, dragY: number) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece) {
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
      if (!piece) {
        return;
      }

      piece.shape.input!.cursor = 'grab';

      this.hideDebugOutline();
    });

    this.input.on('pointerup', () => this.hideDebugOutline());
    this.input.on('pointerupoutside', () => this.hideDebugOutline());
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
    if (!this.config) {
      return new Phaser.Math.Vector2(point.x, point.y);
    }

    const bounds = this.config.bounds;
    const spanX = Math.max(bounds.width, 1e-6);
    const spanY = Math.max(bounds.height, 1e-6);
    const uniformScale = Math.min(this.scale.width / spanX, this.scale.height / spanY);

    const offsetX = (this.scale.width - spanX * uniformScale) * 0.5;
    const offsetY = (this.scale.height - spanY * uniformScale) * 0.5;

    const x = offsetX + (point.x - bounds.minX) * uniformScale;
    const y = offsetY + (point.y - bounds.minY) * uniformScale;
    return new Phaser.Math.Vector2(x, y);
  }

  private computeCentroid(points: PuzzlePoint[]): PuzzlePoint {
    if (points.length === 0) {
      return { x: 0, y: 0 };
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
      const sum = points.reduce(
        (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
        { x: 0, y: 0 }
      );
      return { x: sum.x / points.length, y: sum.y / points.length };
    }

    area *= 0.5;
    const factor = 1 / (6 * area);
    return { x: cx * factor, y: cy * factor };
  }

  private round(value: number): number {
    const factor = 1_000_000;
    if (value === 0) {
      return 0;
    }

    return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
  }

  private buildPieceGeometry(points: Phaser.Math.Vector2[], anchor: Phaser.Math.Vector2): {
    coords: number[];
    hitArea: Phaser.Geom.Point[];
    target: Phaser.Math.Vector2;
  } {
    if (points.length === 0) {
      return { coords: [], hitArea: [], target: anchor.clone() };
    }

    const coords: number[] = [];
    const hitArea: Phaser.Geom.Point[] = [];

    const sanitized = [...points];
    if (sanitized.length > 1) {
      const first = sanitized[0];
      const last = sanitized[sanitized.length - 1];
      if (Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6) {
        sanitized.pop();
      }
    }

    sanitized.forEach((point) => {
      const localX = point.x - anchor.x;
      const localY = point.y - anchor.y;
      coords.push(localX, localY);
      hitArea.push(new Phaser.Geom.Point(localX, localY));
    });

    return { coords, hitArea, target: anchor.clone() };
  }

  private showDebugOutline(piece: PieceRuntime): void {
    if (!this.debugOverlay) {
      this.debugOverlay = this.add.graphics();
      this.debugOverlay.setDepth(150);
    }

    const overlay = this.debugOverlay;
    overlay.clear();
    overlay.setVisible(true);
    overlay.lineStyle(4, 0x9efcff, 0.9);
    overlay.fillStyle(0x9efcff, 0.12);

    const points = piece.footprint;
    if (points.length === 0) {
      return;
    }

    overlay.beginPath();
    overlay.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      overlay.lineTo(points[i].x, points[i].y);
    }
    overlay.closePath();
    overlay.strokePath();
    overlay.fillPath();
  }

  private hideDebugOutline(): void {
    if (!this.debugOverlay) {
      return;
    }

    this.debugOverlay.clear();
    this.debugOverlay.setVisible(false);
  }

  private createConfigFromSvg(svgContent: string): PuzzleConfig {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(svgContent, 'image/svg+xml');
    const root = documentNode.documentElement;
    const viewBoxRaw = root.getAttribute('viewBox');

    if (!viewBoxRaw) {
      throw new Error('SVG viewBox is required to normalise coordinates.');
    }

    const viewBoxValues = viewBoxRaw.split(/[\s,]+/).map(Number);
    if (viewBoxValues.length !== 4 || viewBoxValues.some((value) => Number.isNaN(value))) {
      throw new Error('SVG viewBox is invalid.');
    }

    const [minX, minY, width, height] = viewBoxValues;
    const outlineElement = documentNode.querySelector<SVGPathElement>('#outline');

    if (!outlineElement) {
      throw new Error('SVG outline path not found.');
    }

    const outlinePoints = this.samplePath(outlineElement);

    const pieceElements = Array.from(documentNode.querySelectorAll<SVGPathElement>('[id^="piece_"]'));

    if (pieceElements.length === 0) {
      throw new Error('No puzzle pieces found in SVG.');
    }

    const pieces = pieceElements
      .map<PuzzlePiece | null>((element) => {
        const id = element.id;
        const d = element.getAttribute('d');
        if (!d) {
          return null;
        }

        const points = this.samplePath(element);
        if (points.length < 3) {
          return null;
        }

        const anchor = this.computeCentroid(points);
        return {
          id,
          points,
          anchor
        };
      })
      .filter((piece): piece is PuzzlePiece => piece !== null)
      .sort((a, b) => {
        const numericA = parseInt(a.id.replace(/[^0-9]/g, ''), 10);
        const numericB = parseInt(b.id.replace(/[^0-9]/g, ''), 10);
        if (Number.isNaN(numericA) || Number.isNaN(numericB)) {
          return a.id.localeCompare(b.id);
        }
        return numericA - numericB;
      });

    const bounds = this.computeBounds(outlinePoints, pieces);

    return { outline: outlinePoints, pieces, bounds };
  }

  private samplePath(pathElement: SVGPathElement): PuzzlePoint[] {
    const pathData = pathElement.getAttribute('d');
    if (!pathData) {
      return [];
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);

    const totalLength = path.getTotalLength();
    if (!Number.isFinite(totalLength) || totalLength === 0) {
      return [];
    }

    const steps = Math.max(Math.ceil(totalLength / 4), 64);
    const points: PuzzlePoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const distance = (i / steps) * totalLength;
      const { x, y } = path.getPointAtLength(distance);
      points.push({ x: this.round(x), y: this.round(y) });
    }

    return this.compactPoints(points);
  }

  private compactPoints(points: PuzzlePoint[], epsilon = 1e-4): PuzzlePoint[] {
    if (points.length === 0) {
      return points;
    }

    const compacted: PuzzlePoint[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prev = compacted[compacted.length - 1];
      const current = points[i];
      const dx = Math.abs(prev.x - current.x);
      const dy = Math.abs(prev.y - current.y);
      if (dx > epsilon || dy > epsilon) {
        compacted.push(current);
      }
    }

    if (compacted.length > 2) {
      const first = compacted[0];
      const last = compacted[compacted.length - 1];
      if (Math.abs(first.x - last.x) > epsilon || Math.abs(first.y - last.y) > epsilon) {
        compacted.push({ ...first });
      }
    }

    return compacted;
  }

  private computeBounds(outline: PuzzlePoint[], pieces: PuzzlePiece[]): PuzzleBounds {
    const allPoints: PuzzlePoint[] = [...outline];
    pieces.forEach((piece) => {
      allPoints.push(...piece.points);
    });

    if (allPoints.length === 0) {
      return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
    }

    let minX = allPoints[0].x;
    let maxX = allPoints[0].x;
    let minY = allPoints[0].y;
    let maxY = allPoints[0].y;

    for (let i = 1; i < allPoints.length; i++) {
      const point = allPoints[i];
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
