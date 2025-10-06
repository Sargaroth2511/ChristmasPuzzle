import Phaser from 'phaser';

import {
  DEFAULT_FILL_ALPHA,
  DEFAULT_STROKE_ALPHA,
  INTRO_HOLD_DURATION,
  EXPLOSION_BOUNCE_DAMPING,
  EXPLOSION_GRAVITY,
  EXPLOSION_GROUND_FRICTION,
  EXPLOSION_MIN_REST_SPEED,
  EXPLOSION_RADIAL_BOOST,
  EXPLOSION_REST_DELAY,
  EXPLOSION_SHIVER_AMPLITUDE,
  EXPLOSION_SHIVER_DURATION,
  EXPLOSION_SHIVER_INTERVAL,
  EXPLOSION_SPIN_DAMPING,
  EXPLOSION_SPIN_RANGE,
  EXPLOSION_STAGGER,
  EXPLOSION_TRAVEL_TIME,
  EXPLOSION_WALL_DAMPING,
  EXPLOSION_WALL_MARGIN,
  GUIDE_FILL_STYLE,
  GUIDE_STROKE_STYLE,
  HOVER_STROKE_DELTA,
  PIECE_HOVER_STROKE_RATIO,
  PIECE_HOVER_STROKE_WIDTH,
  PIECE_STROKE_WIDTH,
  SNAP_ANIMATION_DURATION,
  SNAP_BASE_FACTOR,
  SNAP_DEBUG_MULTIPLIER,
  SNAP_TOLERANCE_LIMITS,
  STAG_BASE_COLOR,
  PLACEMENT_SHIMMER_DURATION,
  PLACEMENT_SHIMMER_BAND_WIDTH_RATIO,
  PLACEMENT_SHIMMER_EDGE_ALPHA,
  PLACEMENT_SHIMMER_LIGHT_VECTOR,
  PLACEMENT_SHIMMER_SWEEP_VECTOR,
  PLACEMENT_SHIMMER_STROKE_MULTIPLIER,
  PUZZLE_SCALE_RATIO,
  DRAG_ACTIVE_SCALE,
  DRAG_SHADOW_OFFSET,
  DRAG_SHADOW_COLOR,
  DRAG_SHADOW_ALPHA,
  DRAG_SHADOW_GLASS_COLOR,
  DRAG_SHADOW_GLASS_ALPHA,
  SCENE_FLOOR_BOTTOM_MARGIN
} from './puzzle.constants';
import { PieceStyling, PuzzleConfig, PuzzlePoint, SceneData } from './puzzle.types';
import { createPuzzleConfigFromSvg, sampleSvgPath } from './puzzle-config';

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
  fillColor: number;
  fillAlpha: number;
  strokeColor: number;
  strokeAlpha: number;
  strokeWidth: number;
  strokeSourceWidth?: number;
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
  detailsOverlay?: Phaser.GameObjects.Graphics;
  detailsMaskGfx?: Phaser.GameObjects.Graphics;
  localPoints: Phaser.Math.Vector2[];
  localCoords: number[];
  detailPaths: PieceDetailPath[];
  shimmerData?: PieceShimmerData;
  shimmerOverlay?: Phaser.GameObjects.Graphics;
  shimmerTween?: Phaser.Tweens.Tween;
  shimmerState?: { progress: number };
  shimmerMask?: Phaser.GameObjects.Graphics;
  shimmerGeometryMask?: Phaser.Display.Masks.GeometryMask;
  dragShadow?: Phaser.GameObjects.Polygon;
  touchHitArea?: Phaser.Geom.Point[];
};

type PieceDetailPath = {
  points: Phaser.Math.Vector2[];
  strokeWidth: number;
  isClosed: boolean;
};

type PieceShimmerEdge = {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  facing: number;
  projection: number;
};

type PieceShimmerDetailSegment = {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  strokeWidth: number;
  facing: number;
  projection: number;
};

type PieceShimmerData = {
  edges: PieceShimmerEdge[];
  detailSegments: PieceShimmerDetailSegment[];
  projectionMin: number;
  projectionMax: number;
  bandHalfWidth: number;
  baseColor: Phaser.Display.Color;
  glintColor: number;
};

type SvgStrokeStyle = {
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  miterLimit?: number;
  fillColor?: number;
  fillAlpha?: number;
};

const calculateSnapTolerance = (shape: Phaser.GameObjects.Polygon, multiplier = 1): number => {
  const bounds = shape.getBounds();
  const maxAxis = Math.max(bounds.width, bounds.height) || 0;
  const dynamicTolerance = maxAxis * SNAP_BASE_FACTOR * multiplier;
  const { min, max } = SNAP_TOLERANCE_LIMITS;
  return Phaser.Math.Clamp(dynamicTolerance, min, max);
};

export class PuzzleScene extends Phaser.Scene {
  private config?: PuzzleConfig;
  private emitter?: Phaser.Events.EventEmitter;
  private pieces: PieceRuntime[] = [];
  private placedCount = 0;
  private startTime = 0;
  private debugOverlay?: Phaser.GameObjects.Graphics;
  private debugEnabled = false;
  private guideOverlay?: Phaser.GameObjects.Graphics;
  private outlineTexture?: Phaser.GameObjects.TileSprite;
  private outlineMaskShape?: Phaser.GameObjects.Graphics;
  private outlineGeometryMask?: Phaser.Display.Masks.GeometryMask;
  private explosionActive = false;
  private explosionComplete = false;
  private shiverTweens: Phaser.Tweens.Tween[] = [];
  private shiverStartTime = 0;
  private glassMode = false;
  private nextDropDepth = 0;
  private svgDoc?: Document;
  private svgClassStyleMap?: Map<string, SvgStrokeStyle>;
  private shimmerSweepDirection = new Phaser.Math.Vector2();
  private shimmerLightDirection = new Phaser.Math.Vector3();
  private reduceMotion = false;
  private dragShadowOffset = new Phaser.Math.Vector2();
  private textResolution = 1;
  private coinContainer?: Phaser.GameObjects.Container;
  private coinSprite?: Phaser.GameObjects.Sprite;
  private coinShadow?: Phaser.GameObjects.Sprite;
  private coinLabel?: Phaser.GameObjects.Text;
  private coinTotal = 0;
  private readonly coinMargin = 28;
  private readonly coinVerticalGap = 30;
  private readonly handleExternalCoinRequest = () => this.emitCoinTotal();

  private resetDragState(piece: PieceRuntime): void {
    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;
    this.clearDragVisuals(piece);
  }

  private updateScatterTargetFromShape(piece: PieceRuntime): void {
    piece.scatterTarget = new Phaser.Math.Vector2(
      piece.shape.x - piece.origin.x,
      piece.shape.y - piece.origin.y
    );
  }

  private syncDetailsTransform(piece: PieceRuntime): void {
    const scaleX = piece.shape.scaleX ?? 1;
    const scaleY = piece.shape.scaleY ?? 1;
    if (piece.detailsOverlay && piece.detailsMaskGfx) {
      piece.detailsOverlay.setPosition(piece.shape.x, piece.shape.y);
      piece.detailsOverlay.rotation = piece.shape.rotation;
      piece.detailsOverlay.setScale(scaleX, scaleY);
      piece.detailsOverlay.setDepth(piece.shape.depth + 0.1);

      piece.detailsMaskGfx.setPosition(piece.shape.x, piece.shape.y);
      piece.detailsMaskGfx.rotation = piece.shape.rotation;
      piece.detailsMaskGfx.setScale(scaleX, scaleY);
    }
    this.syncDragShadow(piece);
  }

  private applyDragVisuals(piece: PieceRuntime, active: boolean): void {
    if (active) {
      piece.shape.setScale(DRAG_ACTIVE_SCALE);
      if (!piece.dragShadow) {
        piece.dragShadow = this.createDragShadow(piece);
      } else {
        this.updateDragShadowStyle(piece, piece.dragShadow);
      }
      this.syncDetailsTransform(piece);
      this.syncDragShadow(piece);
      return;
    }

    this.clearDragVisuals(piece);
  }

  private createDragShadow(piece: PieceRuntime): Phaser.GameObjects.Polygon {
    const shadow = this.add.polygon(piece.shape.x, piece.shape.y, piece.localCoords, DRAG_SHADOW_COLOR, DRAG_SHADOW_ALPHA);
    shadow.setOrigin(piece.shape.originX, piece.shape.originY);
    shadow.setDepth(piece.shape.depth - 0.4);
    shadow.setScrollFactor(0);
    shadow.setRotation(piece.shape.rotation);
    shadow.setScale(piece.shape.scaleX, piece.shape.scaleY);
    shadow.setVisible(true);
    shadow.disableInteractive();
    this.updateDragShadowStyle(piece, shadow);
    return shadow;
  }

  private syncDragShadow(piece: PieceRuntime): void {
    if (!piece.dragShadow) {
      return;
    }

    const offset = this.dragShadowOffset.clone();
    if (piece.shape.rotation !== 0) {
      offset.rotate(piece.shape.rotation);
    }

    piece.dragShadow.setPosition(piece.shape.x + offset.x, piece.shape.y + offset.y);
    piece.dragShadow.setScale(piece.shape.scaleX ?? 1, piece.shape.scaleY ?? 1);
    piece.dragShadow.setRotation(piece.shape.rotation);
    piece.dragShadow.setDepth(piece.shape.depth - 0.4);
  }

  private clearDragVisuals(piece: PieceRuntime): void {
    if (piece.dragShadow) {
      piece.dragShadow.destroy();
      piece.dragShadow = undefined;
    }
    piece.shape.setScale(1);
    this.syncDetailsTransform(piece);
  }

  private updateDragShadowStyle(piece: PieceRuntime, shadow: Phaser.GameObjects.Polygon): void {
    if (!shadow) {
      return;
    }
    if (this.glassMode) {
      shadow.setFillStyle(DRAG_SHADOW_GLASS_COLOR, DRAG_SHADOW_GLASS_ALPHA);
    } else {
      shadow.setFillStyle(DRAG_SHADOW_COLOR, DRAG_SHADOW_ALPHA);
    }
  }

  private addDetailsForPiece(piece: PieceRuntime, doc: Document): void {
    const pieceIdMatch = piece.id.match(/^piece_(\d+)/);
    const pieceNum = pieceIdMatch?.[1];
    if (!pieceNum) {
      return;
    }

    const detailEls = Array.from(doc.querySelectorAll<SVGPathElement>(`[id^="detail_${pieceNum}"]`));
    if (detailEls.length === 0) {
      return;
    }

    if (!this.svgClassStyleMap) {
      this.svgClassStyleMap = this.buildSvgClassStyleMap(doc);
    }

    const basePosition = new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);

    const overlay = this.add.graphics();
    overlay.setDepth(piece.shape.depth + 0.1);
    overlay.setAlpha(this.glassMode ? 0.6 : 1);
    overlay.setVisible(true);
    overlay.setPosition(basePosition.x, basePosition.y);

    for (const el of detailEls) {
      const points = sampleSvgPath(el).map((pt) => this.toCanvasPoint(pt));
      if (points.length < 2) {
        continue;
      }
      const strokeStyle = this.extractStrokeStyle(el);
      const strokeColor = strokeStyle.strokeColor ?? piece.strokeColor ?? 0x000000;
      const strokeAlpha = strokeStyle.strokeAlpha ?? 1;
      const strokeWidth = this.toCanvasStrokeWidth(strokeStyle.strokeWidth ?? 1);
      const fillColor = strokeStyle.fillColor;
      const fillAlpha = strokeStyle.fillAlpha ?? (fillColor !== undefined ? 1 : 0);

      if (strokeStyle.lineCap) {
        (overlay as any).defaultStrokeLineCap = strokeStyle.lineCap;
      }
      if (strokeStyle.lineJoin) {
        (overlay as any).defaultStrokeLineJoin = strokeStyle.lineJoin;
      }
      if (strokeStyle.miterLimit !== undefined) {
        (overlay as any).defaultStrokeMiterLimit = strokeStyle.miterLimit;
      }

      const transformedPoints = points.map((point) => new Phaser.Math.Vector2(point.x - basePosition.x, point.y - basePosition.y));
      const lastPoint = transformedPoints[transformedPoints.length - 1];
      const firstPoint = transformedPoints[0];
      const isClosed = Phaser.Math.Distance.Between(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y) < 0.001;

      overlay.lineStyle(strokeWidth, strokeColor, strokeAlpha);
      overlay.beginPath();
      overlay.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < transformedPoints.length; i += 1) {
        overlay.lineTo(transformedPoints[i].x, transformedPoints[i].y);
      }
      if (isClosed) {
        overlay.closePath();
      }
      overlay.strokePath();

      if (fillColor !== undefined && fillAlpha > 0) {
        overlay.fillStyle(fillColor, fillAlpha);
        overlay.beginPath();
        overlay.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < transformedPoints.length; i += 1) {
          overlay.lineTo(transformedPoints[i].x, transformedPoints[i].y);
        }
        if (isClosed) {
          overlay.closePath();
        }
        overlay.fillPath();
      }

      const localDetailPoints = points.map((point) => new Phaser.Math.Vector2(point.x - piece.target.x, point.y - piece.target.y));
      piece.detailPaths.push({ points: localDetailPoints, strokeWidth, isClosed });
    }

    const maskGfx = this.add.graphics().setVisible(false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.setPosition(basePosition.x, basePosition.y);
    const footprint = piece.footprint;
    if (footprint.length >= 3) {
      maskGfx.beginPath();
      maskGfx.moveTo(footprint[0].x - basePosition.x, footprint[0].y - basePosition.y);
      for (let i = 1; i < footprint.length; i += 1) {
        maskGfx.lineTo(footprint[i].x - basePosition.x, footprint[i].y - basePosition.y);
      }
      maskGfx.closePath();
      maskGfx.fillPath();
    }

    const geometryMask = new Phaser.Display.Masks.GeometryMask(this, maskGfx);
    overlay.setMask(geometryMask);

    piece.detailsOverlay = overlay;
    piece.detailsMaskGfx = maskGfx;

    this.syncDetailsTransform(piece);

    piece.shape.once(Phaser.GameObjects.Events.DESTROY, () => {
      overlay.clearMask(true);
      geometryMask.destroy();
      maskGfx.destroy();
      overlay.destroy();
    });
  }

  private buildSvgClassStyleMap(doc: Document): Map<string, SvgStrokeStyle> {
    const map = new Map<string, SvgStrokeStyle>();
    const styleElements = Array.from(doc.querySelectorAll('style'));
    const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;

    styleElements.forEach((styleEl) => {
      const css = styleEl.textContent ?? '';
      let match: RegExpExecArray | null;
      while ((match = ruleRegex.exec(css)) !== null) {
        const className = match[1];
        const declarations = match[2];
        const strokeMatch = /stroke\s*:\s*([^;]+)/i.exec(declarations);
        const strokeOpacityMatch = /stroke-opacity\s*:\s*([^;]+)/i.exec(declarations);
        const strokeWidthMatch = /stroke-width\s*:\s*([^;]+)/i.exec(declarations);
        const lineCapMatch = /stroke-linecap\s*:\s*([^;]+)/i.exec(declarations);
        const lineJoinMatch = /stroke-linejoin\s*:\s*([^;]+)/i.exec(declarations);
        const miterLimitMatch = /stroke-miterlimit\s*:\s*([^;]+)/i.exec(declarations);
        if (!strokeMatch && !strokeOpacityMatch && !strokeWidthMatch && !lineCapMatch && !lineJoinMatch && !miterLimitMatch) {
          continue;
        }
        const strokeColor = this.parseSvgColorValue(strokeMatch?.[1]);
        const strokeAlpha = this.parseSvgAlphaValue(strokeOpacityMatch?.[1]);
        const strokeWidth = this.parseSvgLengthValue(strokeWidthMatch?.[1]);
        const lineCap = this.parseSvgLineCap(lineCapMatch?.[1]);
        const lineJoin = this.parseSvgLineJoin(lineJoinMatch?.[1]);
        const miterLimit = this.parseSvgMiterLimit(miterLimitMatch?.[1]);
        const fillMatch = /fill\s*:\s*([^;]+)/i.exec(declarations);
        const fillOpacityMatch = /fill-opacity\s*:\s*([^;]+)/i.exec(declarations);
        const fillColor = this.parseSvgColorValue(fillMatch?.[1]);
        const fillAlpha = this.parseSvgAlphaValue(fillOpacityMatch?.[1]);
        map.set(className, { strokeColor, strokeAlpha, strokeWidth, lineCap, lineJoin, miterLimit, fillColor, fillAlpha });
      }
    });

    return map;
  }

  private extractStrokeStyle(element: SVGPathElement): SvgStrokeStyle {
    let strokeColor = this.parseSvgColorValue(element.getAttribute('stroke'));
    let strokeAlpha = this.parseSvgAlphaValue(element.getAttribute('stroke-opacity'));
    let strokeWidth = this.parseSvgLengthValue(element.getAttribute('stroke-width'));
    let lineCap = this.parseSvgLineCap(element.getAttribute('stroke-linecap'));
    let lineJoin = this.parseSvgLineJoin(element.getAttribute('stroke-linejoin'));
    let miterLimit = this.parseSvgMiterLimit(element.getAttribute('stroke-miterlimit'));
    let fillColor = this.parseSvgColorValue(element.getAttribute('fill'));
    let fillAlpha = this.parseSvgAlphaValue(element.getAttribute('fill-opacity'));

    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      const inlineStroke = /stroke\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineOpacity = /stroke-opacity\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineWidth = /stroke-width\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineCap = /stroke-linecap\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineJoin = /stroke-linejoin\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineMiter = /stroke-miterlimit\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineFill = /fill\s*:\s*([^;]+)/i.exec(styleAttr);
      const inlineFillOpacity = /fill-opacity\s*:\s*([^;]+)/i.exec(styleAttr);
      strokeColor = this.parseSvgColorValue(inlineStroke?.[1]) ?? strokeColor;
      strokeAlpha = this.parseSvgAlphaValue(inlineOpacity?.[1]) ?? strokeAlpha;
      strokeWidth = this.parseSvgLengthValue(inlineWidth?.[1]) ?? strokeWidth;
      lineCap = this.parseSvgLineCap(inlineCap?.[1]) ?? lineCap;
      lineJoin = this.parseSvgLineJoin(inlineJoin?.[1]) ?? lineJoin;
      miterLimit = this.parseSvgMiterLimit(inlineMiter?.[1]) ?? miterLimit;
      fillColor = this.parseSvgColorValue(inlineFill?.[1]) ?? fillColor;
      fillAlpha = this.parseSvgAlphaValue(inlineFillOpacity?.[1]) ?? fillAlpha;
    }

    element.classList.forEach((className) => {
      const classStyle = this.svgClassStyleMap?.get(className);
      if (!classStyle) {
        return;
      }
      if (classStyle.strokeColor !== undefined) {
        strokeColor = classStyle.strokeColor;
      }
      if (classStyle.strokeAlpha !== undefined) {
        strokeAlpha = classStyle.strokeAlpha;
      }
      if (classStyle.strokeWidth !== undefined) {
        strokeWidth = classStyle.strokeWidth;
      }
      if (classStyle.lineCap !== undefined) {
        lineCap = classStyle.lineCap;
      }
      if (classStyle.lineJoin !== undefined) {
        lineJoin = classStyle.lineJoin;
      }
      if (classStyle.miterLimit !== undefined) {
        miterLimit = classStyle.miterLimit;
      }
      if (classStyle.fillColor !== undefined) {
        fillColor = classStyle.fillColor;
      }
      if (classStyle.fillAlpha !== undefined) {
        fillAlpha = classStyle.fillAlpha;
      }
    });

    return { strokeColor, strokeAlpha, strokeWidth, lineCap, lineJoin, miterLimit, fillColor, fillAlpha };
  }

  private parseSvgColorValue(value?: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'none') {
      return undefined;
    }

    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      return parseInt(trimmed, 16);
    }

    if (trimmed.startsWith('#')) {
      try {
        return Phaser.Display.Color.HexStringToColor(trimmed).color;
      } catch {
        return undefined;
      }
    }

    const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const [r = 0, g = 0, b = 0] = rgbMatch[1]
        .split(',')
        .map((component) => Number.parseFloat(component.trim())) as [number, number, number];
      return Phaser.Display.Color.GetColor(r, g, b);
    }

    return undefined;
  }

  private parseSvgAlphaValue(value?: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const alpha = Number.parseFloat(value.trim());
    if (!Number.isFinite(alpha)) {
      return undefined;
    }

    return Phaser.Math.Clamp(alpha, 0, 1);
  }

  private parseSvgLengthValue(value?: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const numeric = Number.parseFloat(value.trim());
    if (!Number.isFinite(numeric)) {
      return undefined;
    }

    return Math.max(numeric, 0);
  }

  private parseSvgLineCap(value?: string | null): CanvasLineCap | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'butt' || trimmed === 'round' || trimmed === 'square') {
      return trimmed;
    }

    return undefined;
  }

  private parseSvgLineJoin(value?: string | null): CanvasLineJoin | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'miter' || trimmed === 'round' || trimmed === 'bevel') {
      return trimmed as CanvasLineJoin;
    }

    return undefined;
  }

  private parseSvgMiterLimit(value?: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const numeric = Number.parseFloat(value.trim());
    if (!Number.isFinite(numeric)) {
      return undefined;
    }

    return Math.max(numeric, 0);
  }

  private stylePieceForBurst(piece: PieceRuntime, depth: number): void {
    piece.shape.disableInteractive();
    piece.shape.setDepth(120 + depth);
    const { fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth } = this.getActiveStyle(piece);
    piece.shape.setFillStyle(fillColor, fillAlpha);
    piece.shape.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
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

    if (piece.detailsOverlay) {
      piece.detailsOverlay.setVisible(true);
      const overlayAlpha = this.glassMode ? 0.45 : 0.75;
      piece.detailsOverlay.setAlpha(overlayAlpha);
    }
    if (piece.detailsMaskGfx) {
      piece.detailsMaskGfx.setVisible(false);
    }

    this.syncDetailsTransform(piece);
  }

  private stylePieceForPuzzle(piece: PieceRuntime): void {
    const { fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth } = this.getActiveStyle(piece);
    piece.shape.setFillStyle(fillColor, fillAlpha);
    piece.shape.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
    piece.shape.setAlpha(1);
    const hitAreaPoints = piece.touchHitArea ?? piece.hitArea;
    piece.shape.setInteractive(new Phaser.Geom.Polygon(hitAreaPoints), Phaser.Geom.Polygon.Contains);
    if (piece.shape.input) {
      piece.shape.input.cursor = 'grab';
    }

    piece.placed = false;
    piece.exploding = false;
    piece.hasLaunched = false;
    piece.velocity = undefined;
    piece.angularVelocity = undefined;
    this.resetDragState(piece);

    if (piece.detailsOverlay) {
      piece.detailsOverlay.setVisible(true);
      const overlayAlpha = this.glassMode ? 0.5 : 0.9;
      piece.detailsOverlay.setAlpha(overlayAlpha);
    }
    if (piece.detailsMaskGfx) {
      piece.detailsMaskGfx.setVisible(false);
    }

    this.syncDetailsTransform(piece);
  }

  private recordRestingState(piece: PieceRuntime): void {
    piece.restPosition = new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
    piece.restRotation = piece.shape.rotation;
    this.updateScatterTargetFromShape(piece);
    this.syncDetailsTransform(piece);
  }

  constructor() {
    super('PuzzleScene');
  }

  preload(): void {
    this.load.text('puzzle-svg', 'assets/pieces/stag_with_all_lines.svg');
    this.load.image('scene-background', 'assets/background/snowy_mauntains_background.png');
    this.load.image('outline-texture', 'assets/background/greyPaper.png');
    if (!this.textures.exists('hud-coin-spritesheet')) {
      this.load.spritesheet('hud-coin-spritesheet', 'assets/coins/oh22_coin_spin_256x256_12_refined.png', {
        frameWidth: 256,
        frameHeight: 256
      });
    }
  }

  init(data: SceneData): void {
    this.emitter = data?.emitter;
    this.debugEnabled = data.showDebug ?? false;
    this.glassMode = data.useGlassStyle ?? false;
    this.shimmerSweepDirection
      .set(-Math.abs(PLACEMENT_SHIMMER_SWEEP_VECTOR.x || 1), -Math.abs(PLACEMENT_SHIMMER_SWEEP_VECTOR.y || 1))
      .normalize();
    this.shimmerLightDirection
      .set(PLACEMENT_SHIMMER_LIGHT_VECTOR.x, PLACEMENT_SHIMMER_LIGHT_VECTOR.y, PLACEMENT_SHIMMER_LIGHT_VECTOR.z)
      .normalize();
    this.dragShadowOffset
      .set(DRAG_SHADOW_OFFSET.x, DRAG_SHADOW_OFFSET.y);
    this.textResolution = this.resolveTextResolution();
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } else {
      this.reduceMotion = false;
    }

    this.emitter?.on('coin-total-request', this.handleExternalCoinRequest);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.emitter?.off('coin-total-request', this.handleExternalCoinRequest);
    });
  }

  create(): void {
    const svgText = this.cache.text.get('puzzle-svg');
    if (!svgText) {
      throw new Error('Puzzle SVG data missing.');
    }
    const svgDoc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    this.svgDoc = svgDoc;
    this.svgClassStyleMap = this.buildSvgClassStyleMap(svgDoc);
    this.config = createPuzzleConfigFromSvg(svgDoc);

    this.pieces = [];
    this.placedCount = 0;
    this.addSceneBackground();
    this.createCoinHud();

    this.drawGuide();
    this.setupDragHandlers();
    this.initializePiecesAtTarget();

    if (this.reduceMotion) {
      this.preparePiecesForPuzzle();
      return;
    }

    this.time.delayedCall(INTRO_HOLD_DURATION, () => this.beginIntroShiver());
  }

  private addSceneBackground(): void {
    const bg = this.add.image(this.scale.width * 0.5, this.scale.height * 0.5, 'scene-background');
    const scale = Math.max(this.scale.width / bg.width, this.scale.height / bg.height);
    bg.setScale(scale);
    bg.setScrollFactor(0);
    bg.setDepth(-200);
    if (bg.postFX) {
      bg.postFX.clear();
      bg.postFX.addBlur(0, 3.2, 1.4);
    }
  }

  private createCoinHud(): void {
    if (!this.coinContainer) {
      if (!this.anims.exists('coin-spin')) {
        this.anims.create({
          key: 'coin-spin',
          frames: this.anims.generateFrameNumbers('hud-coin-spritesheet', { start: 0, end: 11 }),
          frameRate: 16,
          repeat: -1
        });
      }

      const coin = this.add.sprite(0, 0, 'hud-coin-spritesheet', 0);
      coin.setScale(0.36);
      coin.setScrollFactor(0);
      coin.setDepth(10_000);
      // Don't play animation initially
      this.coinSprite = coin;

      // Create shadow for coin
      const coinShadow = this.add.sprite(3, 3, 'hud-coin-spritesheet', 0);
      coinShadow.setScale(0.36);
      coinShadow.setScrollFactor(0);
      coinShadow.setDepth(9_999);
      coinShadow.setTint(0x000000);
      coinShadow.setAlpha(0.3);
      this.coinShadow = coinShadow;

      const label = this.add.text(0, 0, '0', {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#0b1724',
        strokeThickness: 4,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 2,
          stroke: true,
          fill: true
        }
      });
      label.setOrigin(0.5, 1);
      label.setScrollFactor(0);
      label.setDepth(10_001);
      this.coinLabel = label;

      const container = this.add.container(0, 0, [coinShadow, coin, label]);
      container.setDepth(10_000);
      container.setScrollFactor(0);
      container.setAlpha(1); // Always visible
      this.coinContainer = container;
    }

    this.coinTotal = this.registry.get('coin-total') ?? 0;
    this.updateCoinHudLabel();
    this.updateCoinHudLayout();
    this.emitCoinTotal();
  }

  private updateCoinHudLayout(): void {
    if (!this.coinContainer || !this.coinSprite || !this.coinLabel) {
      return;
    }

    const camera = this.cameras.main;
    const right = camera.worldView.right - 5; // More into corner
    const sceneHeight = camera.worldView.height;
    const top = camera.worldView.top + 5; // Higher position

    this.coinContainer.setPosition(right - this.coinSprite.displayWidth * 0.5, top + this.coinSprite.displayHeight * 0.5);
    this.coinSprite.setPosition(0, 0);
    this.coinLabel.setPosition(0, this.coinSprite.displayHeight * 0.5 + this.coinVerticalGap); // Label below coin
  }

  private updateCoinHudLabel(): void {
    if (!this.coinLabel) {
      return;
    }

    this.coinLabel.setText(this.coinTotal.toString());
  }

  private incrementCoinTotal(amount: number): void {
    this.coinTotal += amount;
    this.registry.set('coin-total', this.coinTotal);
    this.updateCoinHudLabel();
    this.updateCoinHudLayout();
    this.emitCoinTotal();

    if (this.coinContainer && this.coinSprite) {
      // Start spinning for exactly 6.5 spins: fast to slow
      this.coinSprite.play('coin-spin');
      this.coinShadow.play('coin-spin');
      this.coinSprite.anims.timeScale = 3; // Start fast
      this.coinShadow.anims.timeScale = 3; // Start fast

      this.tweens.add({
        targets: [this.coinSprite.anims, this.coinShadow.anims],
        timeScale: 1, // End at normal speed
        duration: 2400, // Duration for approximately 6.5 spins for smoother ending
        ease: 'Cubic.easeOut', // Smoother easing
        onComplete: () => {
          // Stop spinning and show initial side
          this.coinSprite.anims.stop();
          this.coinShadow.anims.stop();
          this.coinSprite.setFrame(0);
          this.coinShadow.setFrame(0);
        }
      });

      // Brief scale animation for feedback
      this.tweens.add({
        targets: this.coinContainer,
        scale: 1.2,
        duration: 200,
        ease: 'Sine.easeOut',
        yoyo: true
      });
    }
  }

  private resetCoinHud(): void {
    this.coinTotal = 0;
    this.registry.set('coin-total', this.coinTotal);
    this.updateCoinHudLabel();
    this.emitCoinTotal();
  }

  private emitCoinTotal(): void {
    this.emitter?.emit('coin-total-changed', this.coinTotal);
  }

  private drawGuide(): void {
    const config = this.config!;
    const outlinePoints = config.outline.map((point) => this.toCanvasPoint(point));

    this.outlineTexture?.clearMask(true);
    this.outlineTexture?.destroy();
    this.outlineTexture = undefined;

    this.outlineGeometryMask?.destroy();
    this.outlineGeometryMask = undefined;

    this.outlineMaskShape?.destroy();
    this.outlineMaskShape = undefined;

    this.guideOverlay?.destroy();
    this.guideOverlay = undefined;

    const strokeOnly = this.add.graphics();
    const outlineStyle = config.outlineStyle;
    const strokeColor = outlineStyle?.strokeColor ?? GUIDE_STROKE_STYLE.color;
    const strokeAlpha = outlineStyle?.strokeAlpha ?? GUIDE_STROKE_STYLE.alpha;
    const strokeWidthRaw = outlineStyle?.strokeWidth;
    const strokeWidth = strokeWidthRaw && strokeWidthRaw > 0 ? this.toCanvasStrokeWidth(strokeWidthRaw) : GUIDE_STROKE_STYLE.width;

    if (strokeAlpha > 0) {
      strokeOnly.lineStyle(strokeWidth, strokeColor, Phaser.Math.Clamp(strokeAlpha, 0, 1));
      strokeOnly.beginPath();
      strokeOnly.moveTo(outlinePoints[0].x, outlinePoints[0].y);
      for (let i = 1; i < outlinePoints.length; i++) {
        strokeOnly.lineTo(outlinePoints[i].x, outlinePoints[i].y);
      }
      strokeOnly.closePath();
      strokeOnly.strokePath();
    }

    strokeOnly.setDepth(-18);
    strokeOnly.setVisible(true);
    strokeOnly.name = 'guide-overlay';
    this.guideOverlay = strokeOnly;

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.beginPath();
    maskShape.moveTo(outlinePoints[0].x, outlinePoints[0].y);
    for (let i = 1; i < outlinePoints.length; i++) {
      maskShape.lineTo(outlinePoints[i].x, outlinePoints[i].y);
    }
    maskShape.closePath();
    maskShape.fillPath();
    maskShape.setVisible(false);

    const geometryMask = new Phaser.Display.Masks.GeometryMask(this, maskShape);

    const textureAlpha = Phaser.Math.Clamp(outlineStyle?.fillAlpha ?? 1, 0, 1);

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    outlinePoints.forEach((pt) => {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    });
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const centerX = minX + width * 0.5;
    const centerY = minY + height * 0.5;

    const texture = this.add.tileSprite(centerX, centerY, width, height, 'outline-texture');
    texture.setDepth(-19);
    texture.setScrollFactor(0);
    texture.setMask(geometryMask);
    texture.setAlpha(textureAlpha);

    this.outlineMaskShape = maskShape;
    this.outlineGeometryMask = geometryMask;
    this.outlineTexture = texture;
  }
  private initializePiecesAtTarget(): void {
    const config = this.config!;

    config.pieces.forEach((piece) => {
      const fillColor = piece.fillColor ?? STAG_BASE_COLOR;
      const fillAlpha = Phaser.Math.Clamp(piece.fillAlpha ?? DEFAULT_FILL_ALPHA, 0, 1);
      const strokeColor = piece.strokeColor ?? 0x000000;
      const strokeAlpha = Phaser.Math.Clamp(piece.strokeAlpha ?? DEFAULT_STROKE_ALPHA, 0, 1);
      const strokeWidth = this.toCanvasStrokeWidth(piece.strokeWidth);
      const actualPoints = piece.points.map((pt) => this.toCanvasPoint(pt));
      const anchor = this.toCanvasPoint(piece.anchor);
      const geometry = this.buildPieceGeometry(actualPoints, anchor);

      const shape = this.add.polygon(anchor.x, anchor.y, geometry.coords, fillColor, fillAlpha);
      shape.setDepth(10 + this.pieces.length);
      shape.setAlpha(1);

      const origin = new Phaser.Math.Vector2(shape.displayOriginX, shape.displayOriginY);
      shape.setPosition(anchor.x + origin.x, anchor.y + origin.y);

      const runtimePiece: PieceRuntime = {
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
        fillColor,
        fillAlpha,
        strokeColor,
        strokeAlpha,
        strokeWidth,
        strokeSourceWidth: piece.strokeWidth,
        restPosition: new Phaser.Math.Vector2(anchor.x + origin.x, anchor.y + origin.y),
        restRotation: 0,
        localPoints: geometry.localPoints,
        localCoords: geometry.coords.slice(),
        detailPaths: []
      };

      // runtimePiece.touchHitArea = this.createTouchHitArea(geometry.hitArea, 26);

      const initialStyle = this.getActiveStyle(runtimePiece);
      shape.setFillStyle(initialStyle.fillColor, initialStyle.fillAlpha);
      shape.setStrokeStyle(initialStyle.strokeWidth, initialStyle.strokeColor, initialStyle.strokeAlpha);

      const index = this.pieces.length;
      shape.setData('pieceIndex', index);

      shape.on('pointerover', () => {
        if (!shape.input?.enabled) {
          return;
        }
        const hoverStroke = this.getHoverStrokeStyle(runtimePiece);
        shape.setStrokeStyle(hoverStroke.width, hoverStroke.color, hoverStroke.alpha);
        if (!runtimePiece.isDragging) {
          shape.input!.cursor = 'grab';
          this.input.setDefaultCursor('grab');
          if (this.input.manager?.canvas) {
            this.input.manager.canvas.style.cursor = 'grab';
          }
        }
      });

      shape.on('pointerout', () => {
        if (!shape.input?.enabled) {
          return;
        }
        const active = this.getActiveStyle(runtimePiece);
        shape.setFillStyle(active.fillColor, active.fillAlpha);
        shape.setStrokeStyle(active.strokeWidth, active.strokeColor, active.strokeAlpha);
        if (!runtimePiece.isDragging) {
          this.input.setDefaultCursor('default');
          if (this.input.manager?.canvas) {
            this.input.manager.canvas.style.cursor = 'default';
          }
        }
      });

      this.pieces.push(runtimePiece);

      if (this.svgDoc) {
        this.addDetailsForPiece(runtimePiece, this.svgDoc);
      }

      runtimePiece.shimmerData = this.buildShimmerData(runtimePiece);
    });
  }

  private beginIntroShiver(): void {
    if (this.pieces.length === 0) {
      this.preparePiecesForPuzzle();
      return;
    }

    this.stopShiverTweens();
    this.shiverStartTime = this.time.now;

    this.pieces.forEach((piece) => {
      const rest = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
      piece.shape.setPosition(rest.x, rest.y);
      piece.shape.rotation = 0;
      this.syncDetailsTransform(piece);
      this.shiverTweens.push(this.createPieceShiverTween(piece, rest));
    });

    this.time.delayedCall(EXPLOSION_SHIVER_DURATION, () => this.endIntroShiver());
  }

  private createPieceShiverTween(piece: PieceRuntime, anchor: Phaser.Math.Vector2): Phaser.Tweens.Tween {
    const amplitude = Phaser.Math.FloatBetween(EXPLOSION_SHIVER_AMPLITUDE.min, EXPLOSION_SHIVER_AMPLITUDE.max);
    const offsetX = Phaser.Math.FloatBetween(-amplitude, amplitude);
    const offsetY = Phaser.Math.FloatBetween(-amplitude, amplitude);

    const tween = this.tweens.add({
      targets: piece.shape,
      x: anchor.x + offsetX,
      y: anchor.y + offsetY,
      duration: Phaser.Math.Between(EXPLOSION_SHIVER_INTERVAL.min, EXPLOSION_SHIVER_INTERVAL.max),
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true,
      onUpdate: () => this.syncDetailsTransform(piece)
    });

    tween.timeScale = 0.5;

    tween.on('yoyo', () => {
      const nextAmplitude = Phaser.Math.FloatBetween(EXPLOSION_SHIVER_AMPLITUDE.min, EXPLOSION_SHIVER_AMPLITUDE.max);
      const nextOffsetX = Phaser.Math.FloatBetween(-nextAmplitude, nextAmplitude);
      const nextOffsetY = Phaser.Math.FloatBetween(-nextAmplitude, nextAmplitude);
      tween.updateTo('x', anchor.x + nextOffsetX, true);
      tween.updateTo('y', anchor.y + nextOffsetY, true);
    });

    return tween;
  }

  private endIntroShiver(): void {
    this.stopShiverTweens();

    this.pieces.forEach((piece) => {
      const rest = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
      piece.shape.setPosition(rest.x, rest.y);
      piece.shape.rotation = 0;
      this.syncDetailsTransform(piece);
    });

    this.beginIntroExplosion();
  }

  private stopShiverTweens(): void {
    this.shiverTweens.forEach((tween) => tween.remove());
    this.shiverTweens = [];
    this.shiverStartTime = 0;
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
    this.syncDetailsTransform(piece);

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
    const minY = Math.max(this.scale.height - 80, 40);
    const maxY = this.scale.height - 64;

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
    this.stopShiverTweens();
    this.pieces.forEach((piece, index) => {
      const restPosition = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
      piece.shape.setPosition(restPosition.x, restPosition.y);
      const startRotation = piece.restRotation ?? 0;
      piece.shape.rotation = startRotation;
      this.recordRestingState(piece);
      piece.shape.setData('pieceIndex', index);
      this.disposeShimmer(piece);
      this.clearDragVisuals(piece);
      this.stylePieceForPuzzle(piece);
      this.input.setDraggable(piece.shape);
      this.syncDetailsTransform(piece);
    });

    this.placedCount = 0;
    this.startTime = this.time.now;
    this.refreshSnapToleranceForAll();
    this.emitter?.emit('puzzle-reset');
    this.explosionComplete = true;
    this.explosionActive = false;

    this.resetCoinHud();

    this.emitter?.emit('explosion-complete');

    const maxDepth = this.pieces.reduce((m, p) => Math.max(m, p.shape.depth), 0);
    this.nextDropDepth = maxDepth + 1;
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
    if (this.shiverTweens.length > 0 && this.shiverStartTime > 0) {
      const elapsed = this.time.now - this.shiverStartTime;
      const progress = Phaser.Math.Clamp(elapsed / EXPLOSION_SHIVER_DURATION, 0, 1);
      const timeScale = Phaser.Math.Linear(0.45, 2.3, progress);
      this.shiverTweens.forEach((tween) => {
        tween.timeScale = timeScale;
      });
    }

    if (this.explosionActive && !this.explosionComplete) {
      this.updateExplosion(delta);
    }

    this.updateCoinHudLayout();
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
        this.syncDetailsTransform(piece);
        return;
      }

      launchedCount += 1;

      if (!piece.exploding || !piece.velocity) {
        settledCount += 1;
        this.syncDetailsTransform(piece);
        return;
      }

      const velocity = piece.velocity;
      velocity.y += EXPLOSION_GRAVITY * dt;

      piece.shape.x += velocity.x * dt;
      piece.shape.y += velocity.y * dt;
      this.syncDetailsTransform(piece);

      if (piece.angularVelocity) {
        piece.shape.rotation += piece.angularVelocity * dt;
        this.syncDetailsTransform(piece);
      }

      const bounds = piece.shape.getBounds();
      const leftLimit = EXPLOSION_WALL_MARGIN;
      const rightLimit = this.scale.width - EXPLOSION_WALL_MARGIN;
      const floorLimit = Math.min(
        this.scale.height - SCENE_FLOOR_BOTTOM_MARGIN,
        piece.scatterTarget.y + piece.origin.y
      );

      if (bounds.left < leftLimit) {
        const overlap = leftLimit - bounds.left;
        piece.shape.x += overlap;
        if (velocity.x < 0) {
          velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
        }
        this.syncDetailsTransform(piece);
      }

      if (bounds.right > rightLimit) {
        const overlap = bounds.right - rightLimit;
        piece.shape.x -= overlap;
        if (velocity.x > 0) {
          velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
        }
        this.syncDetailsTransform(piece);
      }

      // Center obstacle collision (25% width pillar)
      const centerStart = this.scale.width * 0.375;
      const centerEnd = this.scale.width * 0.625;
      if (bounds.right > centerStart && bounds.left < centerEnd) {
        if (bounds.centerX < (centerStart + centerEnd) / 2) {
          // Hit left side of pillar
          const overlap = bounds.right - centerStart;
          if (overlap > 0) {
            piece.shape.x -= overlap;
            if (velocity.x > 0) {
              velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
            }
          }
        } else {
          // Hit right side of pillar
          const overlap = centerEnd - bounds.left;
          if (overlap > 0) {
            piece.shape.x += overlap;
            if (velocity.x < 0) {
              velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
            }
          }
        }
        this.syncDetailsTransform(piece);
      }

      const adjustedBounds = piece.shape.getBounds();

      if (adjustedBounds.bottom > floorLimit) {
        const overlap = adjustedBounds.bottom - floorLimit;
        piece.shape.y -= overlap;
        this.syncDetailsTransform(piece);

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
            piece.shape.setScale(1);
            this.recordRestingState(piece);
            this.syncDetailsTransform(piece);
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
        piece.shape.setScale(1);
        this.recordRestingState(piece);
        settledCount += 1;
        this.syncDetailsTransform(piece);
      }

      this.syncDetailsTransform(piece);
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
    this.syncDetailsTransform(piece);
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
      this.input.setDefaultCursor('grabbing');
      if (this.input.manager?.canvas) {
        this.input.manager.canvas.style.cursor = 'grabbing';
      }
      const pointerWorldX = pointer.worldX ?? pointer.x;
      const pointerWorldY = pointer.worldY ?? pointer.y;
      piece.dragStartRotation = piece.shape.rotation;
      piece.dragOffset = new Phaser.Math.Vector2(piece.shape.x - pointerWorldX, piece.shape.y - pointerWorldY);
      piece.dragPointer = new Phaser.Math.Vector2(pointerWorldX, pointerWorldY);
      this.updateDraggingPieceTransform(piece, pointer);

      piece.shape.setDepth(this.nextDropDepth++);
      this.syncDetailsTransform(piece);
      this.applyDragVisuals(piece, true);

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
          if (piece.isDragging) {
            this.updateDraggingPieceTransform(piece);
          } else {
            this.syncDetailsTransform(piece);
          }
        });
      } else {
        piece.shape.rotation = 0;
        this.updateDraggingPieceTransform(piece, pointer);
      }

      // piece.shape.setDepth(50 + index);
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
        this.syncDetailsTransform(piece);
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
      this.applyDragVisuals(piece, false);

      const snapped = this.trySnapPiece(piece);
      if (!snapped) {
        piece.shape.input!.cursor = 'grab';
        this.input.manager?.canvas && (this.input.manager.canvas.style.cursor = 'grab');
        piece.shape.setDepth(this.nextDropDepth++);
        const active = this.getActiveStyle(piece);
        piece.shape.setFillStyle(active.fillColor, active.fillAlpha);
        piece.shape.setStrokeStyle(active.strokeWidth, active.strokeColor, active.strokeAlpha);
        this.syncDetailsTransform(piece);
      } else {
        this.input.setDefaultCursor('default');
        if (this.input.manager?.canvas) {
          this.input.manager.canvas.style.cursor = 'default';
        }
        if (this.debugEnabled) {
          this.hideDebugOutline();
        }
      }

      
    });

    this.input.on('pointerup', () => {
      const hit = this.input.hitTestPointer(this.input.activePointer);
      if (hit.length === 0) {
        this.input.setDefaultCursor('default');
        if (this.input.manager?.canvas) {
          this.input.manager.canvas.style.cursor = 'default';
        }
      }
      if (this.debugEnabled) {
        this.hideDebugOutline();
      }
    });
    this.input.on('pointerupoutside', () => {
      const hit = this.input.hitTestPointer(this.input.activePointer);
      if (hit.length === 0) {
        this.input.setDefaultCursor('default');
        if (this.input.manager?.canvas) {
          this.input.manager.canvas.style.cursor = 'default';
        }
      }
      if (this.debugEnabled) {
        this.hideDebugOutline();
      }
    });
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

    this.clearDragVisuals(piece);
    piece.placed = true;
    piece.shape.disableInteractive();
    piece.shape.setDepth(10);
    this.syncDetailsTransform(piece);

    const targetPosition = new Phaser.Math.Vector2(
      piece.target.x + piece.origin.x,
      piece.target.y + piece.origin.y
    );

    const handleSnapComplete = () => {
      this.syncDetailsTransform(piece);
      this.playPlacementShimmer(piece);
    };

    const tween = this.tweens.add({
      targets: piece.shape,
      x: targetPosition.x,
      y: targetPosition.y,
      duration: SNAP_ANIMATION_DURATION,
      ease: Phaser.Math.Easing.Cubic.Out,
      onUpdate: () => this.syncDetailsTransform(piece),
      onComplete: handleSnapComplete
    });

    if (!tween) {
      piece.shape.setPosition(targetPosition.x, targetPosition.y);
      handleSnapComplete();
    }

    const activeStyle = this.getActiveStyle(piece);
    piece.shape.setStrokeStyle(activeStyle.strokeWidth, activeStyle.strokeColor, activeStyle.strokeAlpha);
    piece.shape.setFillStyle(activeStyle.fillColor, activeStyle.fillAlpha);

    this.placedCount += 1;
    this.incrementCoinTotal(1);

    this.emitter?.emit('puzzle-piece-placed', {
      pieceId: piece.id,
      placedCount: this.placedCount,
      totalPieces: this.pieces.length
    });

    if (this.placedCount === this.pieces.length) {
      const elapsedSeconds = (this.time.now - this.startTime) / 1000;
      this.emitter?.emit('puzzle-complete', { elapsedSeconds });
    }
  }

  private playPlacementShimmer(piece: PieceRuntime): void {
    if (!piece.shimmerData || this.reduceMotion) {
      return;
    }

    this.disposeShimmer(piece);

    const overlay = this.add.graphics();
    overlay.setBlendMode(Phaser.BlendModes.ADD);
    overlay.setDepth(piece.shape.depth + 5);
    overlay.setScrollFactor(0);

    const maskGfx = this.add.graphics();
    maskGfx.setScrollFactor(0);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.beginPath();
    const localPoints = piece.localPoints;
    const worldOffsetX = piece.shape.x - piece.origin.x;
    const worldOffsetY = piece.shape.y - piece.origin.y;
    if (localPoints.length >= 2) {
      maskGfx.moveTo(worldOffsetX + localPoints[0].x, worldOffsetY + localPoints[0].y);
      for (let i = 1; i < localPoints.length; i += 1) {
        const pt = localPoints[i];
        maskGfx.lineTo(worldOffsetX + pt.x, worldOffsetY + pt.y);
      }
      maskGfx.closePath();
      maskGfx.fillPath();
    }
    const geometryMask = new Phaser.Display.Masks.GeometryMask(this, maskGfx);
    overlay.setMask(geometryMask);

    const state = { progress: 0 };
    piece.shimmerOverlay = overlay;
    piece.shimmerState = state;
    piece.shimmerMask = maskGfx;
    piece.shimmerGeometryMask = geometryMask;

    const duration = PLACEMENT_SHIMMER_DURATION;
    piece.shimmerTween = this.tweens.add({
      targets: state,
      progress: 1,
      delay: 100,
      duration,
      ease: (t: number) => this.cubicBezierEase(t, 0.16, 1, 0.3, 1),
      onUpdate: () => this.updateShimmerOverlay(piece),
      onComplete: () => {
        this.updateShimmerOverlay(piece);
        this.disposeShimmer(piece);
      }
    });
  }

  private updateShimmerOverlay(piece: PieceRuntime): void {
    if (!piece.shimmerOverlay || !piece.shimmerData || !piece.shimmerState) {
      return;
    }

    const overlay = piece.shimmerOverlay;
    const data = piece.shimmerData;
    const progress = Phaser.Math.Clamp(piece.shimmerState.progress, 0, 1);

    overlay.clear();
    overlay.setDepth(piece.shape.depth + 201);

    const bandStart = data.projectionMax + data.bandHalfWidth;
    const bandEnd = data.projectionMin - data.bandHalfWidth;
    const bandCenter = Phaser.Math.Linear(bandStart, bandEnd, progress);
    const sweepDir = this.shimmerSweepDirection;

    const offsetX = piece.shape.x - piece.origin.x;
    const offsetY = piece.shape.y - piece.origin.y;

    data.edges.forEach((edge) => {
      if (edge.facing <= 0) {
        return;
      }
      const projection = edge.projection;
      const distance = Math.abs(projection - bandCenter);
      const bandFactor = this.computeBandFactor(distance, data.bandHalfWidth);
      const intensity = Phaser.Math.Clamp(bandFactor * edge.facing, 0, 1);
      if (intensity <= 0.001) {
        return;
      }
      const startX = offsetX + edge.start.x;
      const startY = offsetY + edge.start.y;
      const endX = offsetX + edge.end.x;
      const endY = offsetY + edge.end.y;
      const stroke = this.computeShimmerStrokeColor(data.baseColor, intensity);
      const baseWidth = Math.max(piece.strokeWidth, 0.6);
      const glowWidth = Math.max(baseWidth * PLACEMENT_SHIMMER_STROKE_MULTIPLIER, baseWidth + 2);
      overlay.lineStyle(glowWidth, stroke.color, stroke.alpha);
      overlay.beginPath();
      overlay.moveTo(startX, startY);
      overlay.lineTo(endX, endY);
      overlay.strokePath();
    });

    data.detailSegments.forEach((segment) => {
      const projection = segment.projection;
      const distance = Math.abs(projection - bandCenter);
      const bandFactor = this.computeBandFactor(distance, data.bandHalfWidth);
      const intensity = Phaser.Math.Clamp(bandFactor * segment.facing, 0, 1);
      if (intensity <= 0.001) {
        return;
      }
      const startX = offsetX + segment.start.x;
      const startY = offsetY + segment.start.y;
      const endX = offsetX + segment.end.x;
      const endY = offsetY + segment.end.y;
      const stroke = this.computeShimmerStrokeColor(data.baseColor, intensity);
      const baseWidth = Math.max(segment.strokeWidth || piece.strokeWidth, 0.6);
      const glowWidth = Math.max(baseWidth * PLACEMENT_SHIMMER_STROKE_MULTIPLIER, baseWidth + 2);
      overlay.lineStyle(glowWidth, stroke.color, stroke.alpha);
      overlay.beginPath();
      overlay.moveTo(startX, startY);
      overlay.lineTo(endX, endY);
      overlay.strokePath();
    });
  }

  private disposeShimmer(piece: PieceRuntime): void {
    piece.shimmerTween?.remove();
    piece.shimmerTween = undefined;
    piece.shimmerState = undefined;
    if (piece.shimmerOverlay && piece.shimmerGeometryMask) {
      piece.shimmerOverlay.clearMask(true);
    }
    if (piece.shimmerOverlay) {
      piece.shimmerOverlay.clear();
      piece.shimmerOverlay.destroy();
      piece.shimmerOverlay = undefined;
    }
    if (piece.shimmerMask) {
      piece.shimmerMask.destroy();
      piece.shimmerMask = undefined;
    }
    if (piece.shimmerGeometryMask) {
      piece.shimmerGeometryMask.destroy();
      piece.shimmerGeometryMask = undefined;
    }
  }

  private buildShimmerData(piece: PieceRuntime): PieceShimmerData | undefined {
    const points = piece.localPoints;
    if (!points || points.length < 2) {
      return undefined;
    }

    const sweepDir = this.shimmerSweepDirection;
    const lightDir2D = new Phaser.Math.Vector2(-this.shimmerLightDirection.x, -this.shimmerLightDirection.y).normalize();
    let minProj = Number.POSITIVE_INFINITY;
    let maxProj = Number.NEGATIVE_INFINITY;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    points.forEach((pt) => {
      const projection = pt.dot(sweepDir);
      minProj = Math.min(minProj, projection);
      maxProj = Math.max(maxProj, projection);
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    });

    const width = Math.max(maxX - minX, 1e-3);
    const height = Math.max(maxY - minY, 1e-3);
    const diagonal = Math.hypot(width, height);
    const bandHalfWidth = Math.max((diagonal * PLACEMENT_SHIMMER_BAND_WIDTH_RATIO) * 0.5, 6);

    const edges: PieceShimmerEdge[] = [];
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      if (!current || !next) {
        continue;
      }

      const edgeVector = new Phaser.Math.Vector2(next.x - current.x, next.y - current.y);
      if (edgeVector.lengthSq() === 0) {
        continue;
      }
      edgeVector.normalize();
      const edgeNormal = new Phaser.Math.Vector2(-edgeVector.y, edgeVector.x).normalize();
      const facing = Phaser.Math.Clamp(edgeNormal.dot(lightDir2D), 0, 1);
      const midProjection = new Phaser.Math.Vector2((current.x + next.x) * 0.5, (current.y + next.y) * 0.5).dot(sweepDir);
      edges.push({ start: current, end: next, facing, projection: midProjection });
    }

    const detailSegments: PieceShimmerDetailSegment[] = [];
    piece.detailPaths.forEach((path) => {
      const pathPoints = path.points;
      if (pathPoints.length < 2) {
        return;
      }

      const count = path.isClosed ? pathPoints.length : pathPoints.length - 1;
      for (let i = 0; i < count; i += 1) {
        const start = pathPoints[i];
        const end = pathPoints[(i + 1) % pathPoints.length];
        const segmentVector = new Phaser.Math.Vector2(end.x - start.x, end.y - start.y);
        if (segmentVector.lengthSq() === 0) {
          continue;
        }

        const startProjection = start.dot(sweepDir);
        const endProjection = end.dot(sweepDir);
        const midpoint = new Phaser.Math.Vector2((start.x + end.x) * 0.5, (start.y + end.y) * 0.5);
        const projection = midpoint.dot(sweepDir);
        minProj = Math.min(minProj, startProjection, endProjection, projection);
        maxProj = Math.max(maxProj, startProjection, endProjection, projection);

        const direction = segmentVector.clone().normalize();
        const normal = new Phaser.Math.Vector2(-direction.y, direction.x).normalize();
        const facing = Phaser.Math.Clamp(Math.abs(normal.dot(lightDir2D)) * 0.9 + 0.1, 0.1, 1);

        detailSegments.push({
          start: start.clone(),
          end: end.clone(),
          strokeWidth: path.strokeWidth,
          facing,
          projection
        });
      }
    });

    const baseColor = Phaser.Display.Color.IntegerToColor(piece.strokeColor ?? piece.fillColor ?? STAG_BASE_COLOR);
    const glintColor = 0xffffff;

    return {
      edges,
      detailSegments,
      projectionMin: minProj,
      projectionMax: maxProj,
      bandHalfWidth,
      baseColor,
      glintColor
    };
  }

  private computeBandFactor(distance: number, halfWidth: number): number {
    if (halfWidth <= 0) {
      return 0;
    }
    const normalized = Phaser.Math.Clamp(1 - distance / halfWidth, 0, 1);
    return normalized * normalized * (3 - 2 * normalized);
  }

  private computeShimmerStrokeColor(_base: Phaser.Display.Color, intensity: number): { color: number; alpha: number } {
    const clamped = Phaser.Math.Clamp(intensity, 0, 1);
    const minAlpha = Math.min(PLACEMENT_SHIMMER_EDGE_ALPHA * 0.35, PLACEMENT_SHIMMER_EDGE_ALPHA);
    const alpha = Phaser.Math.Linear(minAlpha, PLACEMENT_SHIMMER_EDGE_ALPHA, clamped);
    return { color: 0xffffff, alpha };
  }

  private resolveTextResolution(): number {
    if (typeof window !== 'undefined' && window.devicePixelRatio) {
      return Math.max(2, window.devicePixelRatio);
    }
    return 2;
  }


  private cubicBezierEase(t: number, x1: number, y1: number, x2: number, y2: number): number {
    const clampT = Phaser.Math.Clamp(t, 0, 1);

    const sampleCurveX = (u: number) => {
      const invU = 1 - u;
      return (
        3 * invU * invU * u * x1 +
        3 * invU * u * u * x2 +
        u * u * u
      );
    };

    const sampleCurveY = (u: number) => {
      const invU = 1 - u;
      return (
        3 * invU * invU * u * y1 +
        3 * invU * u * u * y2 +
        u * u * u
      );
    };

    const sampleDerivativeX = (u: number) => {
      return (
        3 * x1 * (1 - u) * (1 - u) +
        6 * (x2 - x1) * (1 - u) * u +
        3 * (1 - x2) * u * u
      );
    };

    let u = clampT;
    for (let i = 0; i < 6; i++) {
      const x = sampleCurveX(u) - clampT;
      if (Math.abs(x) < 1e-4) {
        return sampleCurveY(u);
      }
      const d = sampleDerivativeX(u);
      if (Math.abs(d) < 1e-6) {
        break;
      }
      u -= x / d;
    }

    let lower = 0;
    let upper = 1;
    u = clampT;

    for (let i = 0; i < 12 && upper - lower > 1e-4; i++) {
      const x = sampleCurveX(u);
      if (x < clampT) {
        lower = u;
      } else {
        upper = u;
      }
      u = (upper + lower) * 0.5;
    }

    return sampleCurveY(u);
  }

  private getUniformScale(): number {
    if (!this.config) {
      return 1;
    }

    const bounds = this.config.bounds;
    const spanX = Math.max(bounds.width, 1e-6);
    const spanY = Math.max(bounds.height, 1e-6);
    const baseScale = Math.min(this.scale.width / spanX, this.scale.height / spanY);
    return baseScale * PUZZLE_SCALE_RATIO;
  }

  private toCanvasStrokeWidth(strokeWidth?: number): number {
    if (!strokeWidth || strokeWidth <= 0) {
      return PIECE_STROKE_WIDTH;
    }

    const scale = this.getUniformScale();
    return Math.max(strokeWidth * scale, 0.2);
  }

  private toCanvasPoint(point: PuzzlePoint): Phaser.Math.Vector2 {
    if (!this.config) {
      return new Phaser.Math.Vector2(point.x, point.y);
    }

    const bounds = this.config.bounds;
    const spanX = Math.max(bounds.width, 1e-6);
    const spanY = Math.max(bounds.height, 1e-6);
    const baseScale = Math.min(this.scale.width / spanX, this.scale.height / spanY);
    const uniformScale = baseScale * PUZZLE_SCALE_RATIO;

    const offsetX = (this.scale.width - spanX * uniformScale) * 0.5;
    const offsetY = (this.scale.height - spanY * uniformScale) * 0.5;

    const x = offsetX + (point.x - bounds.minX) * uniformScale;
    const y = offsetY + (point.y - bounds.minY) * uniformScale;
    return new Phaser.Math.Vector2(x, y);
  }

  private buildPieceGeometry(points: Phaser.Math.Vector2[], anchor: Phaser.Math.Vector2): {
    coords: number[];
    hitArea: Phaser.Geom.Point[];
    target: Phaser.Math.Vector2;
    localPoints: Phaser.Math.Vector2[];
  } {
    if (points.length === 0) {
      return { coords: [], hitArea: [], target: anchor.clone(), localPoints: [] };
    }

    const coords: number[] = [];
    const hitArea: Phaser.Geom.Point[] = [];
    const localPoints: Phaser.Math.Vector2[] = [];

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
      localPoints.push(new Phaser.Math.Vector2(localX, localY));
    });

    return { coords, hitArea, target: anchor.clone(), localPoints };
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

  setDebugVisible(show: boolean): void {
    this.debugEnabled = show;

    if (!show) {
      this.hideDebugOutline();
    }

    this.refreshSnapToleranceForAll();
  }

  setGlassMode(enabled: boolean): void {
    if (this.glassMode === enabled) {
      return;
    }

    this.glassMode = enabled;

    this.pieces.forEach((piece) => {
      if (piece.placed) {
        piece.shape.setFillStyle(piece.fillColor, piece.fillAlpha);
        const strokeWidth = piece.strokeWidth;
        if (this.glassMode) {
          piece.shape.setStrokeStyle(strokeWidth, 0x142031, 0.6);
        } else {
          piece.shape.setStrokeStyle(strokeWidth, piece.strokeColor, piece.strokeAlpha);
        }
      } else {
        const active = this.getActiveStyle(piece);
        piece.shape.setFillStyle(active.fillColor, active.fillAlpha);
        piece.shape.setStrokeStyle(active.strokeWidth, active.strokeColor, active.strokeAlpha);
      }

      if (piece.detailsOverlay) {
        const overlayAlpha = this.glassMode ? 0.5 : 0.9;
        piece.detailsOverlay.setAlpha(overlayAlpha);
      }

      if (piece.dragShadow) {
        this.updateDragShadowStyle(piece, piece.dragShadow);
      }

      this.syncDetailsTransform(piece);
    });
  }

  private getActiveStyle(piece: PieceRuntime): PieceStyling {
    const strokeWidth = piece.strokeSourceWidth
      ? this.toCanvasStrokeWidth(piece.strokeSourceWidth)
      : piece.strokeWidth;
    const isGlass = this.glassMode && !piece.placed;
    const fillAlpha = isGlass ? piece.fillAlpha * 0.25 : piece.fillAlpha;
    const strokeAlpha = isGlass ? piece.strokeAlpha * 0.7 : piece.strokeAlpha;

    const clampedFillAlpha = Phaser.Math.Clamp(fillAlpha, 0, 1);
    const clampedStrokeAlpha = Phaser.Math.Clamp(strokeAlpha, 0, 1);
    const width = Math.max(strokeWidth, 0.2);

    piece.strokeWidth = width;

    return {
      fillColor: piece.fillColor,
      fillAlpha: clampedFillAlpha,
      strokeColor: piece.strokeColor,
      strokeAlpha: clampedStrokeAlpha,
      strokeWidth: width
    };
  }

  private getHoverStrokeStyle(piece: PieceRuntime): { width: number; color: number; alpha: number } {
    const base = this.getActiveStyle(piece);
    const width = Math.max(base.strokeWidth * PIECE_HOVER_STROKE_RATIO, base.strokeWidth + HOVER_STROKE_DELTA);
    const alphaBoost = this.glassMode ? 0.08 : 0.06;
    const alpha = Phaser.Math.Clamp(base.strokeAlpha + alphaBoost, 0, 1);
    return { width, color: base.strokeColor, alpha };
  }

}
