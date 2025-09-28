import Phaser from 'phaser';

type SceneData = {
  emitter?: Phaser.Events.EventEmitter;
  showDebug?: boolean;
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
  placed: boolean;
  snapTolerance: number;
  origin: Phaser.Math.Vector2;
  hitArea: Phaser.Geom.Point[];
  scatterTarget: Phaser.Math.Vector2;
  velocity?: Phaser.Math.Vector2;
  angularVelocity?: number;
  exploding?: boolean;
  hasLaunched?: boolean;
  restPosition?: Phaser.Math.Vector2;
  restRotation?: number;
  dragOffset?: Phaser.Math.Vector2;
  dragPointer?: Phaser.Math.Vector2;
  dragStartRotation?: number;
  isDragging?: boolean;
};

type PuzzleBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

const FROST_BASE_COLOR = 0xffffff;
const SNAP_ANIMATION_DURATION = 180;
const SNAP_BASE_FACTOR = 0.09;
const SNAP_DEBUG_MULTIPLIER = 2.6;
const INTRO_HOLD_DURATION = 1200;
const EXPLOSION_STAGGER = 60;
const EXPLOSION_GRAVITY = 2200;
const EXPLOSION_TRAVEL_TIME = { min: 0.72, max: 0.95 } as const;
const EXPLOSION_RADIAL_BOOST = { min: 260, max: 420 } as const;
const EXPLOSION_SPIN_RANGE = { min: -2.4, max: 2.4 } as const;
const EXPLOSION_BOUNCE_DAMPING = 0.36;
const EXPLOSION_GROUND_FRICTION = 0.82;
const EXPLOSION_SPIN_DAMPING = 0.7;
const EXPLOSION_MIN_REST_SPEED = 40;
const EXPLOSION_REST_DELAY = 220;
const EXPLOSION_WALL_MARGIN = 64;
const EXPLOSION_WALL_DAMPING = 0.42;

const calculateSnapTolerance = (shape: Phaser.GameObjects.Polygon, multiplier = 1): number => {
  const bounds = shape.getBounds();
  const maxAxis = Math.max(bounds.width, bounds.height) || 0;
  const dynamicTolerance = maxAxis * SNAP_BASE_FACTOR * multiplier;
  return Phaser.Math.Clamp(dynamicTolerance, 18, 120);
};

export class PuzzleScene extends Phaser.Scene {
  private config?: PuzzleConfig;
  private emitter?: Phaser.Events.EventEmitter;
  private pieces: PieceRuntime[] = [];
  private placedCount = 0;
  private startTime = 0;
  private debugOverlay?: Phaser.GameObjects.Graphics;
  private debugEnabled = true;
  private guideOverlay?: Phaser.GameObjects.Graphics;
  private helpLabel?: Phaser.GameObjects.Text;
  private explosionActive = false;
  private explosionComplete = false;

  private resetDragState(piece: PieceRuntime): void {
    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;
  }

  private updateScatterTargetFromShape(piece: PieceRuntime): void {
    piece.scatterTarget = new Phaser.Math.Vector2(
      piece.shape.x - piece.origin.x,
      piece.shape.y - piece.origin.y
    );
  }

  private stylePieceForBurst(piece: PieceRuntime, depth: number): void {
    piece.shape.disableInteractive();
    piece.shape.setDepth(120 + depth);
    piece.shape.setFillStyle(FROST_BASE_COLOR, 0);
    piece.shape.setStrokeStyle(2.6, 0x000000, 0.85);
    piece.shape.setAlpha(1);
    piece.shape.setScale(1);
    piece.shape.rotation = 0;

    piece.snapTolerance = 0;
    piece.velocity = undefined;
    piece.angularVelocity = undefined;
    piece.exploding = false;
    piece.hasLaunched = false;
    piece.restPosition = undefined;
    piece.restRotation = undefined;
    this.resetDragState(piece);
  }

  private stylePieceForPuzzle(piece: PieceRuntime, depth: number): void {
    piece.shape.setDepth(30 + depth);
    piece.shape.setFillStyle(FROST_BASE_COLOR, 0);
    piece.shape.setStrokeStyle(2.5, 0x000000, 0.9);
    piece.shape.setAlpha(1);
    piece.shape.setInteractive(new Phaser.Geom.Polygon(piece.hitArea), Phaser.Geom.Polygon.Contains);
    if (piece.shape.input) {
      piece.shape.input.cursor = 'grab';
    }

    piece.placed = false;
    piece.exploding = false;
    piece.hasLaunched = false;
    piece.velocity = undefined;
    piece.angularVelocity = undefined;
    this.resetDragState(piece);
  }

  private recordRestingState(piece: PieceRuntime): void {
    piece.restPosition = new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
    piece.restRotation = piece.shape.rotation;
    this.updateScatterTargetFromShape(piece);
  }

  constructor() {
    super('PuzzleScene');
  }

  preload(): void {
    this.load.text('puzzle-svg', 'assets/pieces/Zeichnung.svg');
  }

  init(data: SceneData): void {
    this.emitter = data?.emitter;
    this.debugEnabled = data.showDebug ?? true;
  }

  create(): void {
    const svgText = this.cache.text.get('puzzle-svg');
    if (!svgText) {
      throw new Error('Puzzle SVG data missing.');
    }

    this.config = this.createConfigFromSvg(svgText);

    this.pieces = [];
    this.placedCount = 0;
    this.cameras.main.setBackgroundColor('#BEC6A8');

    this.drawGuide();
    this.setupDragHandlers();
    this.initializePiecesAtTarget();

    this.helpLabel = this.add
      .text(this.scale.width * 0.5, this.scale.height - 28, 'Snap pieces inside the glowing outline', {
        color: '#b7c7ff',
        fontSize: '20px',
        fontFamily: 'Segoe UI, Roboto, sans-serif'
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.time.delayedCall(INTRO_HOLD_DURATION, () => this.beginIntroExplosion());
  }

  private drawGuide(): void {
    const outlinePoints = this.config!.outline.map((point) => this.toCanvasPoint(point));
    this.guideOverlay?.destroy();
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
    guide.setVisible(true);
    guide.name = 'guide-overlay';
    this.guideOverlay = guide;
  }
  private initializePiecesAtTarget(): void {
    const config = this.config!;

    config.pieces.forEach((piece) => {
      const actualPoints = piece.points.map((pt) => this.toCanvasPoint(pt));
      const anchor = this.toCanvasPoint(piece.anchor);
      const geometry = this.buildPieceGeometry(actualPoints, anchor);

      const shape = this.add.polygon(anchor.x, anchor.y, geometry.coords, 0x000000, 0);
      shape.setDepth(10 + this.pieces.length);
      shape.setFillStyle(FROST_BASE_COLOR, 1);
      shape.setAlpha(1);
      shape.setStrokeStyle(1.6, 0x142031, 0.6);

      const index = this.pieces.length;
      shape.setData('pieceIndex', index);

      shape.on('pointerover', () => {
        if (!shape.input?.enabled) {
          return;
        }
        shape.setStrokeStyle(3.5, 0x000000, 0.9);
      });

      shape.on('pointerout', () => {
        if (!shape.input?.enabled) {
          return;
        }
        shape.setStrokeStyle(2.5, 0x000000, 0.9);
      });

      const origin = new Phaser.Math.Vector2(shape.displayOriginX, shape.displayOriginY);
      shape.setPosition(anchor.x + origin.x, anchor.y + origin.y);

      this.pieces.push({
        id: piece.id,
        target: geometry.target,
        shape,
        footprint: actualPoints,
        shapePoints: piece.points,
        placed: false,
        snapTolerance: 0,
        origin,
        hitArea: geometry.hitArea,
        scatterTarget: anchor.clone(),
        restPosition: new Phaser.Math.Vector2(anchor.x + origin.x, anchor.y + origin.y),
        restRotation: 0
      });
    });
  }

  private beginIntroExplosion(): void {
    if (this.pieces.length === 0) {
      this.preparePiecesForPuzzle();
      return;
    }

    const scatterPositions: Phaser.Math.Vector2[] = [];
    this.explosionActive = true;
    this.explosionComplete = false;

    this.pieces.forEach((piece, index) => {
      const scatterAnchor = this.generateGroundScatterPosition(scatterPositions);
      scatterPositions.push(scatterAnchor);
      piece.scatterTarget = scatterAnchor;

      this.stylePieceForBurst(piece, index);

      const launchDelay = index * EXPLOSION_STAGGER;
      this.time.delayedCall(launchDelay, () => this.launchPieceExplosion(piece));
    });
  }

  private launchPieceExplosion(piece: PieceRuntime): void {
    const start = new Phaser.Math.Vector2(piece.target.x + piece.origin.x, piece.target.y + piece.origin.y);
    piece.shape.setPosition(start.x, start.y);
    piece.shape.setScale(Phaser.Math.FloatBetween(0.96, 1.04));
    piece.shape.rotation = Phaser.Math.FloatBetween(-0.12, 0.12);

    const travelTime = Phaser.Math.FloatBetween(EXPLOSION_TRAVEL_TIME.min, EXPLOSION_TRAVEL_TIME.max);
    const floorWorld = piece.scatterTarget.y + piece.origin.y;
    const dx = piece.scatterTarget.x - piece.target.x;
    const dy = floorWorld - start.y;

    const baseVx = dx / travelTime;
    const baseVy = (dy - 0.5 * EXPLOSION_GRAVITY * travelTime * travelTime) / travelTime;

    const horizontalBias = Math.sign(dx || Phaser.Math.FloatBetween(-1, 1));
    const spreadAngle = Phaser.Math.FloatBetween(-Math.PI * 0.25, Math.PI * 0.25);
    const burstAngle = spreadAngle + (horizontalBias * Math.PI * 0.5);
    const burstMagnitude = Phaser.Math.Between(EXPLOSION_RADIAL_BOOST.min, EXPLOSION_RADIAL_BOOST.max);
    const burst = new Phaser.Math.Vector2(Math.cos(burstAngle), Math.sin(burstAngle)).scale(burstMagnitude);

    const downwardLift = Phaser.Math.Between(120, 220);
    const velocity = new Phaser.Math.Vector2(baseVx + burst.x, baseVy - downwardLift + burst.y * 0.15);

    piece.velocity = velocity;
    piece.angularVelocity = Phaser.Math.FloatBetween(EXPLOSION_SPIN_RANGE.min, EXPLOSION_SPIN_RANGE.max);
    piece.exploding = true;
    piece.hasLaunched = true;
  }

  private generateGroundScatterPosition(existing: Phaser.Math.Vector2[]): Phaser.Math.Vector2 {
    const minX = EXPLOSION_WALL_MARGIN + 12;
    const maxX = this.scale.width - EXPLOSION_WALL_MARGIN - 12;
    const minY = Math.max(this.scale.height - 140, 120);
    const maxY = this.scale.height - 54;

    const pickCandidate = () =>
      new Phaser.Math.Vector2(
        Phaser.Math.Between(minX, maxX),
        Phaser.Math.Between(minY, maxY)
      );

    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = pickCandidate();
      const tooClose = existing.some((pos) => Phaser.Math.Distance.Between(pos.x, pos.y, candidate.x, candidate.y) < 72);
      if (!tooClose) {
        return candidate;
      }
      if (attempt === 11) {
        return candidate;
      }
    }

    return pickCandidate();
  }

  private preparePiecesForPuzzle(): void {
    this.guideOverlay?.setVisible(true);
    this.helpLabel?.setVisible(true);

    this.pieces.forEach((piece, index) => {
      const restPosition = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
      const clampedX = Phaser.Math.Clamp(restPosition.x, EXPLOSION_WALL_MARGIN, this.scale.width - EXPLOSION_WALL_MARGIN);
      const clampedY = Phaser.Math.Clamp(restPosition.y, 96, this.scale.height - 40);
      piece.shape.setPosition(clampedX, clampedY);
      const startRotation = piece.restRotation ?? 0;
      piece.shape.rotation = startRotation;
      piece.shape.setScale(1);
      this.recordRestingState(piece);
      piece.shape.setData('pieceIndex', index);
      this.stylePieceForPuzzle(piece, index);
      this.input.setDraggable(piece.shape);
    });

    this.placedCount = 0;
    this.startTime = this.time.now;
    this.refreshSnapToleranceForAll();
    this.emitter?.emit('puzzle-reset');
    this.explosionComplete = true;
    this.explosionActive = false;
  }

  private refreshSnapToleranceForAll(): void {
    const multiplier = this.debugEnabled ? SNAP_DEBUG_MULTIPLIER : 1;
    this.pieces.forEach((piece) => {
      if (piece.placed) {
        return;
      }
      piece.snapTolerance = calculateSnapTolerance(piece.shape, multiplier);
    });
  }

  update(_time: number, delta: number): void {
    if (this.explosionActive && !this.explosionComplete) {
      this.updateExplosion(delta);
    }
  }

  private updateExplosion(delta: number): void {
    const dt = delta / 1000;
    if (dt <= 0) {
      return;
    }

    let settledCount = 0;
    let launchedCount = 0;

    this.pieces.forEach((piece) => {
      if (!piece.hasLaunched) {
        return;
      }

      launchedCount += 1;

      if (!piece.exploding || !piece.velocity) {
        settledCount += 1;
        return;
      }

      const velocity = piece.velocity;
      velocity.y += EXPLOSION_GRAVITY * dt;

      piece.shape.x += velocity.x * dt;
      piece.shape.y += velocity.y * dt;

      if (piece.angularVelocity) {
        piece.shape.rotation += piece.angularVelocity * dt;
      }

      const bounds = piece.shape.getBounds();
      const leftLimit = EXPLOSION_WALL_MARGIN;
      const rightLimit = this.scale.width - EXPLOSION_WALL_MARGIN;
      const floorLimit = Math.min(this.scale.height - 40, piece.scatterTarget.y + piece.origin.y);

      if (bounds.left < leftLimit) {
        const overlap = leftLimit - bounds.left;
        piece.shape.x += overlap;
        if (velocity.x < 0) {
          velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
        }
      }

      if (bounds.right > rightLimit) {
        const overlap = bounds.right - rightLimit;
        piece.shape.x -= overlap;
        if (velocity.x > 0) {
          velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
        }
      }

      const adjustedBounds = piece.shape.getBounds();

      if (adjustedBounds.bottom > floorLimit) {
        const overlap = adjustedBounds.bottom - floorLimit;
        piece.shape.y -= overlap;

        if (velocity.y > 0) {
          velocity.y = -velocity.y * EXPLOSION_BOUNCE_DAMPING;
          velocity.x *= EXPLOSION_GROUND_FRICTION;
          if (piece.angularVelocity) {
            piece.angularVelocity *= EXPLOSION_SPIN_DAMPING;
          }

          if (Math.abs(velocity.y) < EXPLOSION_MIN_REST_SPEED) {
            piece.exploding = false;
            piece.velocity = undefined;
            piece.angularVelocity = undefined;
            this.recordRestingState(piece);
            settledCount += 1;
            return;
          }
        }
      }

      const currentBounds = piece.shape.getBounds();
      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed < EXPLOSION_MIN_REST_SPEED && currentBounds.bottom >= floorLimit - 0.5) {
        piece.exploding = false;
        piece.velocity = undefined;
        piece.angularVelocity = undefined;
        const correction = currentBounds.bottom - floorLimit;
        if (correction > 0) {
          piece.shape.y -= correction;
        }
        this.recordRestingState(piece);
        settledCount += 1;
      }
    });

    if (launchedCount > 0 && settledCount === launchedCount) {
      this.explosionComplete = true;
      this.explosionActive = false;
      this.time.delayedCall(EXPLOSION_REST_DELAY, () => this.preparePiecesForPuzzle());
    }
  }

  private updateDraggingPieceTransform(piece: PieceRuntime, pointer?: Phaser.Input.Pointer | Phaser.Math.Vector2): void {
    if (!piece.dragOffset) {
      return;
    }

    let pointerPosition: Phaser.Math.Vector2 | undefined;

    if (pointer) {
      if ('worldX' in pointer) {
        pointerPosition = piece.dragPointer ?? new Phaser.Math.Vector2();
        pointerPosition.set(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
      } else {
        pointerPosition = piece.dragPointer ?? new Phaser.Math.Vector2();
        pointerPosition.set(pointer.x, pointer.y);
      }
      piece.dragPointer = pointerPosition;
    } else if (piece.dragPointer) {
      pointerPosition = piece.dragPointer;
    }

    if (!pointerPosition) {
      return;
    }

    const startRotation = piece.dragStartRotation ?? 0;
    const delta = piece.shape.rotation - startRotation;
    const rotatedOffset = piece.dragOffset.clone().rotate(delta);
    piece.shape.setPosition(pointerPosition.x + rotatedOffset.x, pointerPosition.y + rotatedOffset.y);
  }

  private setupDragHandlers(): void {
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece || piece.placed) {
        return;
      }

      piece.isDragging = true;
      const pointerWorldX = pointer.worldX ?? pointer.x;
      const pointerWorldY = pointer.worldY ?? pointer.y;
      piece.dragStartRotation = piece.shape.rotation;
      piece.dragOffset = new Phaser.Math.Vector2(piece.shape.x - pointerWorldX, piece.shape.y - pointerWorldY);
      piece.dragPointer = new Phaser.Math.Vector2(pointerWorldX, pointerWorldY);
      this.updateDraggingPieceTransform(piece, pointer);

      const rotationTweenDuration = Math.max(260, Math.abs(piece.shape.rotation) * 380);
      const rotationTween = Math.abs(piece.shape.rotation) > 0.001
        ? this.tweens.add({
            targets: piece.shape,
            rotation: 0,
            duration: rotationTweenDuration,
            ease: Phaser.Math.Easing.Cubic.Out
          })
        : null;

      piece.restRotation = 0;

      if (rotationTween) {
        rotationTween.setCallback('onUpdate', () => {
          if (!piece.isDragging) {
            return;
          }
          this.updateDraggingPieceTransform(piece);
        });
      } else {
        piece.shape.rotation = 0;
        this.updateDraggingPieceTransform(piece, pointer);
      }

      piece.shape.setDepth(50 + index);
      piece.shape.input!.cursor = 'grabbing';
      if (this.debugEnabled) {
        this.showDebugOutline(piece);
      }
    });

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject, dragX: number, dragY: number) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece || piece.placed) {
        return;
      }

      if (!piece.dragOffset) {
        piece.shape.setPosition(dragX, dragY);
        return;
      }

      this.updateDraggingPieceTransform(piece, pointer);
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

      piece.isDragging = false;
      piece.dragOffset = undefined;
      piece.dragPointer = undefined;
      piece.dragStartRotation = undefined;

      const snapped = this.trySnapPiece(piece);

      if (!snapped) {
        piece.shape.input!.cursor = 'grab';
        piece.shape.setDepth(30 + index);
      }

      if (this.debugEnabled) {
        this.hideDebugOutline();
      }
    });

    this.input.on('pointerup', () => this.debugEnabled && this.hideDebugOutline());
    this.input.on('pointerupoutside', () => this.debugEnabled && this.hideDebugOutline());
  }

  private trySnapPiece(piece: PieceRuntime): boolean {
    const anchorX = piece.shape.x - piece.origin.x;
    const anchorY = piece.shape.y - piece.origin.y;
    const distance = Phaser.Math.Distance.Between(anchorX, anchorY, piece.target.x, piece.target.y);
    if (distance > piece.snapTolerance) {
      return false;
    }

    this.placePiece(piece);
    return true;
  }

  private placePiece(piece: PieceRuntime): void {
    if (piece.placed) {
      return;
    }

    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;

    piece.placed = true;
    piece.shape.disableInteractive();
    piece.shape.setDepth(100 + this.placedCount);

    const targetPosition = new Phaser.Math.Vector2(
      piece.target.x + piece.origin.x,
      piece.target.y + piece.origin.y
    );

    const tween = this.tweens.add({
      targets: piece.shape,
      x: targetPosition.x,
      y: targetPosition.y,
      duration: SNAP_ANIMATION_DURATION,
      ease: Phaser.Math.Easing.Cubic.Out
    });

    if (!tween) {
      piece.shape.setPosition(targetPosition.x, targetPosition.y);
    }

    piece.shape.setStrokeStyle(1.4, 0x1d2f52, 0.7);
    piece.shape.setFillStyle(FROST_BASE_COLOR, 0.18);

    this.placedCount += 1;

    this.emitter?.emit('puzzle-piece-placed', {
      pieceId: piece.id,
      placedCount: this.placedCount,
      totalPieces: this.pieces.length
    });

    if (this.placedCount === this.pieces.length) {
      const elapsedSeconds = (this.time.now - this.startTime) / 1000;
      this.showCompletionBanner(elapsedSeconds);
      this.emitter?.emit('puzzle-complete');
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

  setDebugVisible(show: boolean): void {
    this.debugEnabled = show;

    if (!show) {
      this.hideDebugOutline();
    }

    this.refreshSnapToleranceForAll();
  }
}
