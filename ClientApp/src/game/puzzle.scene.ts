import Phaser from 'phaser';
import decomp from 'poly-decomp';

// ⚠️ TESTING MODE - Set to true to skip puzzle and test video flow
// TODO: Set to false before production deployment
const TESTING_VIDEO_MODE = false;

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
  TOUCH_DRAG_OFFSET,
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
  matterOffset?: Phaser.Math.Vector2;
  matterAngleOffset?: number;
  dragConstraint?: any;
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

type SnapValidationInfo = {
  anchorX: number;
  anchorY: number;
  distance: number;
  tolerance: number;
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
  private useMatterPhysics = false; // Track if Matter.js physics is enabled
  private userPrefersMatterPhysics = false; // User's toggle preference (separate from explosion forcing)
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
  private isTouchDragging = false; // Track if current drag is from touch input
  private timerText?: Phaser.GameObjects.Text;
  private completionVideo?: Phaser.GameObjects.Video;

  private resetDragState(piece: PieceRuntime): void {
    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;
    this.isTouchDragging = false;
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
      // DISABLED: No scaling or shadow for cleaner drag experience
      // piece.shape.setScale(DRAG_ACTIVE_SCALE);
      // if (!piece.dragShadow) {
      //   piece.dragShadow = this.createDragShadow(piece);
      // } else {
      //   this.updateDragShadowStyle(piece, piece.dragShadow);
      // }
      // this.syncDragShadow(piece);
      
      this.syncDetailsTransform(piece);
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

  private cleanupScene(): void {
    // Clean up tweens
    this.stopShiverTweens();
    
    // Clean up pieces and their resources
    this.pieces.forEach(piece => {
      this.disposeShimmer(piece);
      this.clearDragVisuals(piece);
      if (piece.shape) {
        piece.shape.destroy();
      }
      if (piece.detailsOverlay) {
        piece.detailsOverlay.destroy();
      }
      if (piece.detailsMaskGfx) {
        piece.detailsMaskGfx.destroy();
      }
    });
    this.pieces = [];
    
    // Clean up coin HUD
    if (this.coinContainer) {
      this.coinContainer.destroy();
      this.coinContainer = undefined;
    }
    this.coinSprite = undefined;
    this.coinShadow = undefined;
    this.coinLabel = undefined;
    
    // Clean up overlays
    if (this.debugOverlay) {
      this.debugOverlay.destroy();
      this.debugOverlay = undefined;
    }
    if (this.guideOverlay) {
      this.guideOverlay.destroy();
      this.guideOverlay = undefined;
    }
    if (this.outlineTexture) {
      this.outlineTexture.destroy();
      this.outlineTexture = undefined;
    }
    if (this.outlineMaskShape) {
      this.outlineMaskShape.destroy();
      this.outlineMaskShape = undefined;
    }
    if (this.outlineGeometryMask) {
      this.outlineGeometryMask.destroy();
      this.outlineGeometryMask = undefined;
    }
    
    // Clean up completion video
    if (this.completionVideo) {
      this.completionVideo.destroy();
      this.completionVideo = undefined;
    }
  }

  constructor() {
    super('PuzzleScene');
  }

  preload(): void {
    this.load.text('puzzle-svg', 'assets/pieces/stag_with_all_lines.svg');
    this.load.image('scene-background', 'assets/background/snowy_mauntains_background.png');
    this.load.image('outline-texture', 'assets/background/greyPaper.png');
    this.load.video('completion-video', 'assets/videos/endscene_v1.mp4', true); // true = no audio
    if (!this.textures.exists('hud-coin-spritesheet')) {
      this.load.spritesheet('hud-coin-spritesheet', 'assets/coins/oh22_coin_spin_256x256_12_refined.png', {
        frameWidth: 256,
        frameHeight: 256
      });
    }
  }

  init(data: SceneData): void {
    // Reset all state for clean restart
    this.config = undefined;
    this.emitter = data?.emitter;
    this.pieces = [];
    this.placedCount = 0;
    this.startTime = 0;
    this.debugOverlay = undefined;
    this.debugEnabled = data.showDebug ?? false;
    this.guideOverlay = undefined;
    this.outlineTexture = undefined;
    this.outlineMaskShape = undefined;
    this.outlineGeometryMask = undefined;
    this.explosionActive = false;
    this.explosionComplete = false;
    this.shiverTweens = [];
    this.shiverStartTime = 0;
    this.glassMode = data.useGlassStyle ?? false;
    this.nextDropDepth = 0;
    this.svgDoc = undefined;
    this.svgClassStyleMap = undefined;
    this.coinContainer = undefined;
    this.coinSprite = undefined;
    this.coinShadow = undefined;
    this.coinLabel = undefined;
    this.coinTotal = 0;
    this.completionVideo = undefined;
    
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
    
    // Listen for video playback request
    this.emitter?.on('play-completion-video', () => {
      this.playCompletionVideo();
    });
    
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.emitter?.off('coin-total-request', this.handleExternalCoinRequest);
      this.emitter?.off('play-completion-video');
      this.cleanupScene();
    });
  }

  create(): void {
    // Register poly-decomp with Matter.js for accurate polygon collision
    if (typeof window !== 'undefined') {
      (window as any).decomp = decomp;
      console.log('✅ poly-decomp registered with Matter.js');
    }
    
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

    // Set up Matter.js world boundaries
    if (this.matter && this.matter.world) {
      const wallThickness = 200;
      const worldWidth = this.scale.width;
      const worldHeight = this.scale.height;
      const wallHeight = worldHeight * 3;
      
      // Floor - aligned with visual floor
      const floorY = worldHeight - SCENE_FLOOR_BOTTOM_MARGIN;
      
      this.matter.add.rectangle(
        worldWidth / 2,
        floorY + wallThickness / 2,
        worldWidth + wallThickness * 2,
        wallThickness,
        { isStatic: true, friction: 0.8, restitution: 0.2, label: 'floor' }
      );
      
      // Ceiling
      this.matter.add.rectangle(
        worldWidth / 2,
        -wallThickness / 2,
        worldWidth + wallThickness * 2,
        wallThickness,
        { isStatic: true, friction: 0.8, restitution: 0.2, label: 'ceiling' }
      );
      
      // Left wall
      this.matter.add.rectangle(
        -wallThickness / 2,
        worldHeight / 2 - wallHeight / 4,
        wallThickness,
        wallHeight,
        { isStatic: true, friction: 0.8, restitution: 0.2, label: 'leftWall' }
      );
      
      // Right wall
      this.matter.add.rectangle(
        worldWidth + wallThickness / 2,
        worldHeight / 2 - wallHeight / 4,
        wallThickness,
        wallHeight,
        { isStatic: true, friction: 0.8, restitution: 0.2, label: 'rightWall' }
      );
      
      console.log(`✅ Matter.js boundaries created (floor at Y=${floorY})`);
      
      // Add visible floor line (greenish color to match app style)
      const floorLine = this.add.graphics();
      floorLine.lineStyle(3, 0x848d6b, 0.8); // Greenish color with slight transparency
      floorLine.beginPath();
      floorLine.moveTo(0, floorY);
      floorLine.lineTo(worldWidth, floorY);
      floorLine.strokePath();
      floorLine.setDepth(5); // Above background but below pieces
      console.log(`✅ Visible floor line drawn at Y=${floorY}`);
      
      // Add collision event handler to wake up sleeping bodies when phantom touches them
      this.matter.world.on('collisionstart', (event: any) => {
        event.pairs.forEach((pair: any) => {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;
          
          // Check if either body is a phantom
          const phantomBody = bodyA.label?.includes('phantom_') ? bodyA : 
                             bodyB.label?.includes('phantom_') ? bodyB : null;
          const otherBody = phantomBody === bodyA ? bodyB : bodyA;
          
          if (phantomBody && otherBody) {
            // Wake up the other body if it's sleeping
            if (otherBody.isSleeping) {
              otherBody.isSleeping = false;
              otherBody.sleepCounter = 0;
            }
          }
        });
      });
      
      console.log(`✅ Phantom collision wake-up handler registered`);
      
      // Disable Matter.js debug rendering (can be re-enabled later if needed)
      if (this.matter.world) {
        // const debugGraphic = this.add.graphics();
        // this.matter.world.debugGraphic = debugGraphic;
        
        (this.matter.world as any).drawDebug = false;
        // (this.matter.world as any).debugConfig = {
        //   staticFillColor: 0xff0000,
        //   staticLineColor: 0xff0000,
        //   dynamicFillColor: 0x00ff00,
        //   dynamicLineColor: 0x00ff00,
        //   lineThickness: 2,
        //   staticFillOpacity: 0.1,
        //   dynamicFillOpacity: 0.1,
        //   staticLineOpacity: 1,
        //   dynamicLineOpacity: 1,
        //   velocityLineColor: 0x0000ff,
        //   velocityLineOpacity: 0.7,
        //   angularVelocityLineColor: 0xff00ff,
        //   renderFill: true,
        //   renderLine: true,
        //   renderVelocity: false
        // };
      }
    }

    this.drawGuide();
    this.setupDragHandlers();
    this.initializePiecesAtTarget();

    // Emit event to notify that PuzzleScene has been created and is active
    this.emitter.emit('puzzle-scene-active');

    // ⚠️ TESTING MODE - Skip intro and simulate puzzle completion for video testing
    if (TESTING_VIDEO_MODE) {
      console.log('⚠️ TESTING MODE: Skipping intro and simulating puzzle completion');
      this.preparePiecesForPuzzle();
      
      // Mark all pieces as placed
      this.placedCount = this.pieces.length;
      
      // Simulate puzzle completion after a short delay
      this.time.delayedCall(500, () => {
        const elapsedSeconds = 120; // 2:00 test time
        this.emitter?.emit('puzzle-complete', { elapsedSeconds });
      });
      return;
    }

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
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 1,
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
    
    this.updateTimerLayout();
  }

  private updateTimerLayout(): void {
    if (!this.timerText || !this.coinContainer || !this.coinLabel) {
      return;
    }

    const camera = this.cameras.main;
    const right = camera.worldView.right - 5;
    const top = camera.worldView.top + 5;
    
    // Position timer below the coin label
    const timerY = top + this.coinSprite!.displayHeight * 0.5 + this.coinVerticalGap + this.coinLabel.displayHeight + 30;
    const timerX = right - this.coinSprite!.displayWidth * 0.5;
    
    this.timerText.setPosition(timerX, timerY);
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

  private createTimerDisplay(): void {
    if (this.timerText) {
      this.timerText.destroy();
    }

    const centerX = this.scale.width * 0.5;
    const topMargin = 40;

    this.timerText = this.add.text(centerX, topMargin, '0:00', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#0b1724',
      strokeThickness: 4,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 1,
        stroke: true,
        fill: true
      }
    });
    this.timerText.setOrigin(0.5, 0);
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(10_001);
    
    this.updateTimerLayout();
  }

  private updateTimerDisplay(): void {
    if (!this.timerText || this.startTime === 0 || this.placedCount === this.pieces.length) {
      return;
    }

    const elapsedSeconds = (this.time.now - this.startTime) / 1000;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
  }

  showHudElements(): void {
    // Called when explosion modal is shown - display coin HUD and timer
    this.createCoinHud();
    this.createTimerDisplay();
  }

  private prepareCompletionVideo(): void {
    console.log('🎬 Pre-creating completion video for instant playback');
    
    if (this.completionVideo) {
      return; // Already created
    }
    
    // Create video centered in the scene
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    this.completionVideo = this.add.video(centerX, centerY, 'completion-video');
    this.completionVideo.setDepth(100_000); // Above everything else
    this.completionVideo.setOrigin(0.5, 0.5);
    this.completionVideo.setVisible(false); // Hidden until we play it
    
    // Wait for video metadata to load and set proper scale
    this.completionVideo.once('metadata', () => {
      const videoElement = this.completionVideo?.video;
      if (videoElement && this.completionVideo) {
        const actualWidth = videoElement.videoWidth;
        const actualHeight = videoElement.videoHeight;
        
        console.log(`📺 Video metadata loaded: ${actualWidth}x${actualHeight}`);
        
        // Calculate scale to fill entire scene (cover mode)
        const scaleX = this.scale.width / actualWidth;
        const scaleY = this.scale.height / actualHeight;
        const scale = Math.max(scaleX, scaleY);
        
        this.completionVideo.setScale(scale);
        console.log(`📏 Video pre-scaled to: ${scale}`);
      }
    });
  }

  private playCompletionVideo(): void {
    console.log('🎬 Playing pre-created completion video');
    
    // Notify app component to hide completion overlay
    this.emitter?.emit('video-playback-started');
    
    // If video wasn't pre-created (shouldn't happen), create it now
    if (!this.completionVideo) {
      console.warn('⚠️ Video not pre-created, creating now...');
      this.prepareCompletionVideo();
    }
    
    if (!this.completionVideo) {
      console.error('❌ Failed to create video');
      return;
    }
    
    // Make video visible
    this.completionVideo.setVisible(true);

    // Hide HUD elements during video
    if (this.coinContainer) {
      this.coinContainer.setVisible(false);
    }
    if (this.timerText) {
      this.timerText.setVisible(false);
    }

    // Hide all puzzle pieces
    this.pieces.forEach(piece => {
      piece.shape.setVisible(false);
      if (piece.detailsOverlay) {
        piece.detailsOverlay.setVisible(false);
      }
    });

    // Play video
    this.completionVideo.play();

    // When video ends, emit event to show thank you modal
    this.completionVideo.once('complete', () => {
      console.log('✅ Completion video finished - keeping last frame visible');
      
      // DON'T hide the video - keep the last frame visible
      // It will be cleaned up when the scene restarts
      
      // Emit event to app component to show thank you modal
      this.emitter?.emit('completion-video-ended');
    });
  }

  startTimer(): void {
    this.startTime = this.time.now;
    // Timer already created in showHudElements, just start counting
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

    // Create a filled graphics object with solid color instead of texture
    const fillGraphics = this.add.graphics();
    fillGraphics.fillStyle(STAG_BASE_COLOR, textureAlpha);
    fillGraphics.fillRect(minX, minY, width, height);
    fillGraphics.setDepth(-19);
    fillGraphics.setScrollFactor(0);
    fillGraphics.setMask(geometryMask);

    this.outlineMaskShape = maskShape;
    this.outlineGeometryMask = geometryMask;
    this.outlineTexture = fillGraphics as any;
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
    console.log(`🔵 [SHIMMER] Starting shimmer phase with ${this.pieces.length} pieces, duration: ${EXPLOSION_SHIVER_DURATION}ms`);
    
    if (this.pieces.length === 0) {
      console.warn(`🔵 [SHIMMER] No pieces found, skipping to puzzle phase`);
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

    console.log(`🔵 [SHIMMER] Created ${this.shiverTweens.length} shimmer tweens, will end in ${EXPLOSION_SHIVER_DURATION}ms`);
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
    const elapsed = this.time.now - this.shiverStartTime;
    console.log(`🟢 [SHIMMER→EXPLOSION] Shimmer phase ended after ${elapsed}ms, transitioning to explosion...`);
    
    this.stopShiverTweens();

    this.pieces.forEach((piece) => {
      const rest = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
      piece.shape.setPosition(rest.x, rest.y);
      piece.shape.rotation = 0;
      this.syncDetailsTransform(piece);
    });

    console.log(`🟢 [SHIMMER→EXPLOSION] All ${this.pieces.length} pieces reset to rest position, calling beginIntroExplosion()...`);
    this.beginIntroExplosion();
  }

  private stopShiverTweens(): void {
    const count = this.shiverTweens.length;
    this.shiverTweens.forEach((tween) => tween.remove());
    this.shiverTweens = [];
    this.shiverStartTime = 0;
    if (count > 0) {
      console.log(`🔴 [SHIMMER] Stopped ${count} shimmer tweens`);
    }
  }

  private beginIntroExplosion(): void {
    console.log(`🟠 [EXPLOSION] Starting explosion phase`);
    console.log(`🟠 [EXPLOSION] - Pieces: ${this.pieces.length}`);
    console.log(`🟠 [EXPLOSION] - Matter.js: ${!!this.matter ? 'Available' : 'NOT AVAILABLE'}`);
    console.log(`🟠 [EXPLOSION] - Matter.world: ${!!this.matter?.world ? 'Available' : 'NOT AVAILABLE'}`);
    
    if (this.pieces.length === 0) {
      console.error(`🟠 [EXPLOSION] ❌ No pieces found, aborting explosion`);
      this.preparePiecesForPuzzle();
      return;
    }

    const scatterPositions: Phaser.Math.Vector2[] = [];
    this.explosionActive = true;
    this.explosionComplete = false;

    // Clean up any existing Matter bodies from previous states
    let removedCount = 0;
    this.pieces.forEach((piece) => {
      if ((piece as any).matterBody) {
        this.removeMatterBody(piece);
        removedCount++;
      }
    });
    if (removedCount > 0) {
      console.log(`🟠 [EXPLOSION] Removed ${removedCount} old Matter bodies`);
    }

    // Enable Matter.js physics for explosion with collisions
    // Always force Matter.js ON during explosion for visual effect
    // User preference (userPrefersMatterPhysics) is preserved and applied after explosion
    this.useMatterPhysics = true;
    
    if (this.matter && this.matter.world) {
      const world = (this.matter.world as any);
      
      // Ensure Matter.js world is running
      if (world.enabled === false) {
        world.enabled = true;
        console.log(`🟠 [EXPLOSION] Enabled Matter.js world`);
      }
      
      if (world.engine && world.engine.gravity) {
        const oldGravity = world.engine.gravity.y;
        world.engine.gravity.y = 2.0; // Increased gravity for more realistic falling during explosion
        console.log(`🟠 [EXPLOSION] Gravity: ${oldGravity} → ${world.engine.gravity.y}`);
        console.log(`🟠 [EXPLOSION] World enabled: ${world.enabled}, autoUpdate: ${world.autoUpdate}`);
      } else {
        console.error(`🟠 [EXPLOSION] ❌ Matter engine/gravity not found!`);
      }
    } else {
      console.error(`🟠 [EXPLOSION] ❌ Matter.js not available!`);
    }

    // Schedule all pieces to launch
    this.pieces.forEach((piece, index) => {
      const scatterAnchor = this.generateGroundScatterPosition(scatterPositions);
      scatterPositions.push(scatterAnchor);
      piece.scatterTarget = scatterAnchor;

      this.stylePieceForBurst(piece, index);

      const launchDelay = index * EXPLOSION_STAGGER;
      this.time.delayedCall(launchDelay, () => this.launchPieceExplosionWithMatter(piece));
    });
    
    console.log(`🟠 [EXPLOSION] ${this.pieces.length} pieces scheduled, first launches immediately, last in ${(this.pieces.length - 1) * EXPLOSION_STAGGER}ms`);
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

  /**
   * Launch piece explosion using Matter.js physics for realistic collisions
   */
  private launchPieceExplosionWithMatter(piece: PieceRuntime): void {
    const start = new Phaser.Math.Vector2(piece.target.x + piece.origin.x, piece.target.y + piece.origin.y);
    
    if (!this.matter) {
      console.warn(`🚀 [LAUNCH] ${piece.id}: Matter.js not available, using tween fallback`);
      this.launchPieceExplosion(piece);
      return;
    }

    // Create accurate polygon collision body using poly-decomp
    this.convertToMatterBody(piece);
    
    const body = (piece as any).matterBody;
    if (!body) {
      console.error(`🚀 [LAUNCH] ${piece.id}: ❌ Body creation failed, using tween fallback`);
      this.launchPieceExplosion(piece);
      return;
    }

    // Override physics properties for explosion effect
    const launchAngle = Phaser.Math.FloatBetween(-0.12, 0.12);
    this.matter.body.set(body, {
      restitution: 0.6,
      friction: 0.05,
      frictionAir: 0.005,
      density: 0.002,
      angle: launchAngle
    });
    
    // Apply high angular damping during explosion to reduce spinning
    // This slows rotation without completely locking it
    body.frictionAir = 0.08; // High air friction reduces rotation
    
    // Calculate launch velocity
    const dx = piece.scatterTarget.x - piece.target.x;
    const horizontalBias = Math.sign(dx || Phaser.Math.FloatBetween(-1, 1));
    const spreadAngle = Phaser.Math.FloatBetween(-Math.PI * 0.25, Math.PI * 0.25);
    const burstAngle = spreadAngle + (horizontalBias * Math.PI * 0.5);
    const burstMagnitude = Phaser.Math.Between(EXPLOSION_RADIAL_BOOST.min, EXPLOSION_RADIAL_BOOST.max) * 0.01;
    
    const velocityX = (dx * 0.005) + Math.cos(burstAngle) * burstMagnitude;
    const velocityY = -Phaser.Math.FloatBetween(1.5, 2.5); // Moderate upward launch (reduced from 3-5)

    // Apply initial velocity
    this.matter.body.setVelocity(body, { x: velocityX, y: velocityY });
    
    // Apply gentle angular velocity for natural rotation
    const angularVelocity = Phaser.Math.FloatBetween(-0.08, 0.08); // Gentle rotation
    this.matter.body.setAngularVelocity(body, angularVelocity);

    piece.exploding = true;
    piece.hasLaunched = true;
    
    // Set initial visual state
    piece.shape.setPosition(start.x, start.y);
    piece.shape.setRotation(launchAngle);
    piece.shape.setScale(Phaser.Math.FloatBetween(0.96, 1.04));
    this.syncMatterBodyWithShape(piece, body);
    this.syncShapeWithMatterBody(piece, body);
    
    // Only log first 3 launches to avoid spam
    if (this.pieces.filter(p => p.hasLaunched).length <= 3) {
      console.log(`🚀 [LAUNCH] ${piece.id}: Body created, velocity=(${velocityX.toFixed(2)}, ${velocityY.toFixed(2)})`);
    }
  }

  private generateGroundScatterPosition(existing: Phaser.Math.Vector2[]): Phaser.Math.Vector2 {
    const minX = EXPLOSION_WALL_MARGIN + 12;
    const maxX = this.scale.width - EXPLOSION_WALL_MARGIN - 12;
    const minY = Math.max(this.scale.height - 120, 40);
    const maxY = this.scale.height - 80;

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
    console.log('[preparePiecesForPuzzle] Starting puzzle preparation');
    this.stopShiverTweens();
    
    // Restore user's physics preference after explosion
    this.useMatterPhysics = this.userPrefersMatterPhysics;
    console.log(`[preparePiecesForPuzzle] Restored user physics preference: ${this.useMatterPhysics ? 'Matter.js' : 'Arcade'}`);
    
    // Gravity handling based on physics mode
    if (this.matter && this.matter.world) {
      const world = (this.matter.world as any);
      if (world.engine && world.engine.gravity) {
        // Keep gravity enabled if using Matter.js physics, otherwise disable it
        world.engine.gravity.y = this.useMatterPhysics ? 1.5 : 0;
        console.log(`[preparePiecesForPuzzle] Gravity ${this.useMatterPhysics ? 'kept enabled (physics mode)' : 'disabled'}`);
      }
    }
    
    this.pieces.forEach((piece, index) => {
      // Handle Matter bodies based on physics mode
      const matterBody = (piece as any).matterBody;
      
      if (this.useMatterPhysics) {
        // Matter physics enabled - ensure body exists
        if (!matterBody) {
          console.log(`[preparePiecesForPuzzle] Creating Matter body for piece ${index} (physics mode enabled)`);
          this.convertToMatterBody(piece);
        } else {
          console.log(`[preparePiecesForPuzzle] Keeping Matter body for piece ${index} (physics mode enabled)`);
        }
      } else {
        // Matter physics disabled - remove body if it exists
        if (matterBody) {
          this.removeMatterBody(piece);
        }
      }
      
      const restPosition = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
      piece.shape.setPosition(restPosition.x, restPosition.y);
      const startRotation = piece.restRotation ?? 0;
      piece.shape.rotation = startRotation;
      
      // CRITICAL: Sync Matter body to match visual position after settling
      // Use the corrected anchor position (shape.position - displayOrigin)
      const updatedMatterBody = (piece as any).matterBody;
      if (updatedMatterBody && this.matter) {
        this.syncMatterBodyWithShape(piece, updatedMatterBody);
        this.matter.body.setVelocity(updatedMatterBody, { x: 0, y: 0 });
        this.matter.body.setAngularVelocity(updatedMatterBody, 0);
        console.log(`[preparePiecesForPuzzle] Synced Matter body ${index} to visual transform, bodyPos=(${updatedMatterBody.position.x.toFixed(1)}, ${updatedMatterBody.position.y.toFixed(1)}), angle=${(updatedMatterBody.angle ?? 0).toFixed(3)}`);
      }
      
      this.recordRestingState(piece);
      piece.shape.setData('pieceIndex', index);
      this.disposeShimmer(piece);
      this.clearDragVisuals(piece);
      this.stylePieceForPuzzle(piece);
      this.input.setDraggable(piece.shape);
      console.log(`[preparePiecesForPuzzle] Piece ${index} made draggable, interactive: ${piece.shape.input?.enabled}, draggable: ${piece.shape.input?.draggable}`);
      this.syncDetailsTransform(piece);
    });

    this.placedCount = 0;
    this.startTime = 0; // Will be set when user clicks 'Los geht's'
    this.refreshSnapToleranceForAll();
    this.emitter?.emit('puzzle-reset');
    this.explosionComplete = true;
    this.explosionActive = false;
    console.log(`[preparePiecesForPuzzle] Puzzle ready - explosionComplete: ${this.explosionComplete}, explosionActive: ${this.explosionActive}, total pieces: ${this.pieces.length}`);

    this.resetCoinHud();

    this.emitter?.emit('explosion-complete');

    const maxDepth = this.pieces.reduce((m, p) => Math.max(m, p.shape.depth), 0);
    this.nextDropDepth = maxDepth + 1;
  }

  private refreshSnapToleranceForAll(): void {
    // Always use base tolerance (no multiplier for guidelines)
    // Server validates with: baseTolerance * 1.15 + 4
    // Client must use the same calculation to avoid mismatches
    const multiplier = 1;
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
      this.updateExplosionWithMatter(delta);
    }

    // Update Matter.js physics bodies to sync with visual shapes
    this.pieces.forEach((piece) => {
      const matterBody = (piece as any).matterBody;
      if (matterBody && !piece.placed) {
        const isBeingDragged = (piece as any).isBeingDragged;
        
        if (isBeingDragged) {
          // Dragged piece: body is static (immovable), manually control position
          // Track previous position for velocity calculation
          const prevX = matterBody.position.x;
          const prevY = matterBody.position.y;
          
          this.syncMatterBodyWithShape(piece, matterBody);
          
          // Calculate drag velocity for momentum transfer
          const deltaX = matterBody.position.x - prevX;
          const deltaY = matterBody.position.y - prevY;
          (piece as any).dragVelocity = { x: deltaX * 60, y: deltaY * 60 }; // Scale to per-second
          
          // Keep it awake
          (matterBody as any).isSleeping = false;
          
          // CRITICAL: Wake up nearby sleeping bodies so they can collide with dragged piece
          // Sleeping bodies don't check collisions (optimization), so we must wake them manually
          this.wakeUpNearbyBodies(matterBody, 150); // Wake bodies within 150px radius
          
          // Apply momentum to nearby pieces that the dragged piece is pushing
          this.applyDragMomentum(piece, matterBody, deltaX, deltaY);
        } else {
          // Free piece: Matter body controls transform, visual shape follows
          const prevX = piece.shape.x;
          const prevY = piece.shape.y;
          this.syncShapeWithMatterBody(piece, matterBody);
          if ((Math.abs(piece.shape.x - prevX) > 5 || Math.abs(piece.shape.y - prevY) > 5) && Math.random() < 0.05) {
            console.log(`⚠️ [SYNC] ${piece.id}: Adjusted visual to follow Matter body (Δx=${(piece.shape.x - prevX).toFixed(1)}, Δy=${(piece.shape.y - prevY).toFixed(1)})`);
          }
        }
      }
    });

    // Custom debug rendering for Matter bodies
    this.renderMatterDebug();

    this.updateCoinHudLayout();
    this.updateTimerDisplay();
  }

  /**
   * Update explosion using Matter.js physics (pieces collide with each other)
   */
  private updateExplosionWithMatter(_delta: number): void {
    let settledCount = 0;
    let launchedCount = 0;
    let matterBodyCount = 0;

    // Check if all pieces have settled
    this.pieces.forEach((piece) => {
      if (!piece.hasLaunched) {
        this.syncDetailsTransform(piece);
        return;
      }

      launchedCount += 1;

      // Check if piece already finished exploding (settled)
      if (!piece.exploding) {
        settledCount += 1;
        return;
      }

      const matterBody = (piece as any).matterBody;
      if (!matterBody) {
        // No Matter body but still exploding - mark as settled
        piece.exploding = false;
        settledCount += 1;
        return;
      }

      matterBodyCount += 1; // Count pieces with active Matter bodies

      // Sync visual shape with Matter body position during explosion
      const prevX = piece.shape.x;
      const prevY = piece.shape.y;
      this.syncShapeWithMatterBody(piece, matterBody);
      if ((Math.abs(piece.shape.x - prevX) > 5 || Math.abs(piece.shape.y - prevY) > 5) && Math.random() < 0.02) {
        console.log(`⚠️ [OFFSET] ${piece.id}: Visual adjusted by Δx=${(piece.shape.x - prevX).toFixed(1)}, Δy=${(piece.shape.y - prevY).toFixed(1)} to stay aligned with Matter body`);
      }
      
      // Check if piece has settled (very low velocity)
      const velocity = matterBody.velocity;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      const angularSpeed = Math.abs(matterBody.angularVelocity);

      const bounds = piece.shape.getBounds();
      const floorLimit = this.scale.height - SCENE_FLOOR_BOTTOM_MARGIN;
      const nearGround = bounds.bottom >= floorLimit - 50;
      
      const isMotionless = speed < 0.01 && angularSpeed < 0.01;
      const shouldSettle = (speed < 0.05 && angularSpeed < 0.05 && nearGround) || isMotionless;
      
      if (shouldSettle && piece.exploding) {
        piece.exploding = false;
        piece.shape.setScale(1);
        this.recordRestingState(piece);
        settledCount += 1;
      }

      this.syncDetailsTransform(piece);
    });

    // Log progress every ~2 seconds to track what's happening
    if (Math.random() < 0.008) {
      // Also check gravity status
      const gravityY = (this.matter?.world as any)?.engine?.gravity?.y || 0;
      const worldEnabled = (this.matter?.world as any)?.enabled;
      const autoUpdate = (this.matter?.world as any)?.autoUpdate;
      console.log(`⏳ [EXPLOSION] ${settledCount}/${launchedCount} settled, ${matterBodyCount} with bodies, gravity=${gravityY}, enabled=${worldEnabled}, autoUpdate=${autoUpdate}`);
      
      // Sample one piece for detailed info
      const samplePiece = this.pieces.find(p => p.hasLaunched && p.exploding);
      if (samplePiece) {
        const sampleBody = (samplePiece as any).matterBody;
        if (sampleBody) {
          const visualAngle = samplePiece.shape.rotation;
          const bodyAngle = sampleBody.angle;
          const angularVel = sampleBody.angularVelocity;
          console.log(`📊 [SAMPLE] ${samplePiece.id}: Y=${sampleBody.position.y.toFixed(1)}, velY=${sampleBody.velocity.y.toFixed(2)}, angle=${bodyAngle.toFixed(3)} (visual=${visualAngle.toFixed(3)}), angVel=${angularVel.toFixed(4)}, sleeping=${sampleBody.isSleeping}, inWorld=${!!sampleBody.world}`);
        }
      }
    }

    // When all pieces have settled, transition to puzzle phase
    if (launchedCount > 0 && settledCount === launchedCount) {
      console.log(`✅ [EXPLOSION→PUZZLE] All ${launchedCount} pieces settled, transitioning to puzzle...`);
      this.explosionComplete = true;
      this.explosionActive = false;
      this.time.delayedCall(EXPLOSION_REST_DELAY, () => this.preparePiecesForPuzzle());
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
        // Clamp pointer to game world bounds to prevent pieces from flying off-screen
        const clampedX = Phaser.Math.Clamp(pointer.worldX ?? pointer.x, 0, this.cameras.main.width);
        const clampedY = Phaser.Math.Clamp(pointer.worldY ?? pointer.y, 0, this.cameras.main.height);
        pointerPosition.set(clampedX, clampedY);
      } else {
        pointerPosition = piece.dragPointer ?? new Phaser.Math.Vector2();
        // Clamp pointer to game world bounds
        const clampedX = Phaser.Math.Clamp(pointer.x, 0, this.cameras.main.width);
        const clampedY = Phaser.Math.Clamp(pointer.y, 0, this.cameras.main.height);
        pointerPosition.set(clampedX, clampedY);
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
    
    // Apply touch offset: move piece up and left on touch devices so it's visible above/beside finger
    const touchOffsetX = this.isTouchDragging ? TOUCH_DRAG_OFFSET.x : 0;
    const touchOffsetY = this.isTouchDragging ? TOUCH_DRAG_OFFSET.y : 0;

    const targetX = pointerPosition.x + rotatedOffset.x + touchOffsetX;
    const targetY = pointerPosition.y + rotatedOffset.y + touchOffsetY;

    // CRITICAL: Always update visual shape position directly
    // This ensures smooth dragging without physics interference
    piece.shape.setPosition(targetX, targetY);
    this.syncDetailsTransform(piece);
  }

  private setupDragHandlers(): void {
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      console.log('[dragstart] Drag started on object');
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        console.log('[dragstart] No pieceIndex found on object');
        return;
      }

      const piece = this.pieces[index as number];
      if (!piece || piece.placed) {
        console.log(`[dragstart] Piece ${index} not draggable - placed: ${piece?.placed}`);
        return;
      }

      console.log(`[dragstart] Piece ${index} drag started successfully`);
      // Detect if this is touch input: touch pointers don't have mouse button properties
      // pointer.event is the native DOM event which has 'touches' for touch events
      const nativeEvent = pointer.event as any;
      this.isTouchDragging = nativeEvent && (nativeEvent.touches !== undefined || nativeEvent.type === 'touchstart');

      piece.isDragging = true;
      
      // If piece has a Matter body, make it static while dragging (acts as immovable kinematic object)
      const matterBody = (piece as any).matterBody;
      if (matterBody && this.matter && this.useMatterPhysics) {
        console.log(`[dragstart] Piece ${index} has Matter body - making it static for drag`);
        this.releaseDragConstraint(piece);
        
        // SIMPLE STATIC APPROACH:
        // Make the dragged piece's body static (infinite mass, pushes others, immovable)
        // Store original state to restore after drag ends
        
        // CRITICAL: setStatic() changes friction/restitution, so store them first!
        (piece as any).wasStatic = matterBody.isStatic;
        (piece as any).originalRestitution = matterBody.restitution;
        (piece as any).originalFriction = matterBody.friction;
        (piece as any).originalFrictionStatic = matterBody.frictionStatic;
        (piece as any).originalDensity = matterBody.density;
        
        // Make it static - this gives it infinite mass and makes it push other bodies
        // WARNING: This also sets friction=1, frictionStatic=0.5, restitution=0
        this.matter.body.setStatic(matterBody, true);
        
        // Restore collision properties so it pushes properly during drag
        // Static bodies with high friction push better
        matterBody.restitution = 0.3;     // Some bounce for visible collisions
        matterBody.friction = 1.0;        // High friction for solid feel
        matterBody.frictionStatic = 1.5;  // Very high static friction
        
        // Mark as being dragged
        (piece as any).isBeingDragged = true;
        
        // Prevent sleeping during drag
        (matterBody as any).isSleeping = false;
        (matterBody as any).sleepCounter = 0;
      }
      
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

      // Note: Don't sync shape with Matter body here - let the rotation tween control the visual
      // The drag handler will sync the Matter body to follow the visual shape
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

      const matterBody = (piece as any).matterBody;
      const usingMatterDrag = !!(matterBody && this.matter && this.useMatterPhysics);

      if (!piece.dragOffset) {
        if (!usingMatterDrag) {
          piece.shape.setPosition(dragX, dragY);
          this.syncDetailsTransform(piece);
          if (matterBody && this.matter) {
            this.syncMatterBodyWithShape(piece, matterBody);
          }
        }
        return;
      }

      this.updateDraggingPieceTransform(piece, pointer);
      
      // CRITICAL: For Matter physics with static dragged body, sync position every frame
      // Static bodies need manual position updates via setPosition()
      if (matterBody && this.matter && (piece as any).isBeingDragged) {
        this.syncMatterBodyWithShape(piece, matterBody);
        
        // Wake up nearby sleeping bodies so they can collide
        this.wakeUpNearbyBodies(matterBody, 150);
      }
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
      this.releaseDragConstraint(piece);
      this.isTouchDragging = false; // Reset touch flag
      (piece as any).previousDragPosition = undefined; // Clean up drag position tracking
      piece.shape.setData('collisionLogged', false); // Reset collision logging flag
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
        
        // If piece has a Matter body, restore it to dynamic state
        const matterBodyDragEnd = (piece as any).matterBody;
        if (matterBodyDragEnd && this.matter && this.useMatterPhysics) {
          // Clear the drag flag
          (piece as any).isBeingDragged = false;
          
          // Restore original static state (should be false - was dynamic before drag)
          const wasStatic = (piece as any).wasStatic ?? false;
          this.matter.body.setStatic(matterBodyDragEnd, wasStatic);
          delete (piece as any).wasStatic;
          
          // CRITICAL: Restore original collision properties
          // setStatic() overwrites these, so we must restore them manually
          const originalRestitution = (piece as any).originalRestitution;
          const originalFriction = (piece as any).originalFriction;
          const originalFrictionStatic = (piece as any).originalFrictionStatic;
          const originalDensity = (piece as any).originalDensity;
          
          if (originalRestitution !== undefined) {
            matterBodyDragEnd.restitution = originalRestitution;
            delete (piece as any).originalRestitution;
          }
          if (originalFriction !== undefined) {
            matterBodyDragEnd.friction = originalFriction;
            delete (piece as any).originalFriction;
          }
          if (originalFrictionStatic !== undefined) {
            matterBodyDragEnd.frictionStatic = originalFrictionStatic;
            delete (piece as any).originalFrictionStatic;
          }
          if (originalDensity !== undefined) {
            // Density affects mass, so use setDensity to update properly
            this.matter.body.setDensity(matterBodyDragEnd, originalDensity);
            delete (piece as any).originalDensity;
          }
          
          // Update Matter body position to match final visual position (after rotation tween)
          this.syncMatterBodyWithShape(piece, matterBodyDragEnd);
          
          // Reset velocity so it doesn't inherit any weird momentum
          this.matter.body.setVelocity(matterBodyDragEnd, { x: 0, y: 0 });
          this.matter.body.setAngularVelocity(matterBodyDragEnd, 0);
          
          // Clear any forces
          matterBodyDragEnd.force.x = 0;
          matterBodyDragEnd.force.y = 0;
          matterBodyDragEnd.torque = 0;
          
          // Wake up the body so it immediately responds to gravity
          (matterBodyDragEnd as any).isSleeping = false;
          (matterBodyDragEnd as any).sleepCounter = 0;
          
          console.log(`[dragend] Piece ${index} restored to dynamic - will fall with gravity`);
        } else if (matterBodyDragEnd && this.matter) {
          // Non-physics mode: just sync position
          this.syncMatterBodyWithShape(piece, matterBodyDragEnd);
        }
      } else {
        this.input.setDefaultCursor('default');
        if (this.input.manager?.canvas) {
          this.input.manager.canvas.style.cursor = 'default';
        }
        if (this.debugEnabled) {
          this.hideDebugOutline();
        }
        
        // Piece was snapped - remove Matter body entirely
        this.removeMatterBody(piece);
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
    
    // Apply the same validation formula as the server to prevent snap rejection
    // Server formula: allowed = snapTolerance * 1.15 + 4
    const serverAllowedDistance = piece.snapTolerance * 1.15 + 4;
    
    const willSnap = distance <= serverAllowedDistance;
    console.log(`🔍 [trySnapPiece] ${piece.id}: distance=${distance.toFixed(2)}, snapTolerance=${piece.snapTolerance}, serverAllowed=${serverAllowedDistance.toFixed(2)}, willSnap=${willSnap}`);
    
    if (!willSnap) {
      console.warn(`⚠️ [trySnapPiece] REJECTING ${piece.id} - too far from target!`);
      return false;
    }

    const snapInfo: SnapValidationInfo = {
      anchorX,
      anchorY,
      distance,
      tolerance: piece.snapTolerance
    };

    this.placePiece(piece, snapInfo);
    return true;
  }

  private placePiece(piece: PieceRuntime, snapInfo?: SnapValidationInfo): void {
    if (piece.placed) {
      return;
    }

    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;
    
    // CRITICAL: Clean up drag state when piece is placed
    (piece as any).isBeingDragged = false;
    
    // Restore original body settings if they were modified
    const matterBody = (piece as any).matterBody;
    if (matterBody) {
      const wasStatic = (piece as any).wasStatic;
      if (wasStatic !== undefined) {
        this.matter!.body.setStatic(matterBody, wasStatic);
        delete (piece as any).wasStatic;
      }
      
      // Restore collision properties
      const originalRestitution = (piece as any).originalRestitution;
      const originalFriction = (piece as any).originalFriction;
      const originalFrictionStatic = (piece as any).originalFrictionStatic;
      const originalDensity = (piece as any).originalDensity;
      
      if (originalRestitution !== undefined) {
        matterBody.restitution = originalRestitution;
        delete (piece as any).originalRestitution;
      }
      if (originalFriction !== undefined) {
        matterBody.friction = originalFriction;
        delete (piece as any).originalFriction;
      }
      if (originalFrictionStatic !== undefined) {
        matterBody.frictionStatic = originalFrictionStatic;
        delete (piece as any).originalFrictionStatic;
      }
      if (originalDensity !== undefined) {
        this.matter!.body.setDensity(matterBody, originalDensity);
        delete (piece as any).originalDensity;
      }
    }

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

    const eventPayload = {
      pieceId: piece.id,
      placedCount: this.placedCount,
      totalPieces: this.pieces.length,
      anchorX: snapInfo?.anchorX ?? piece.target.x,
      anchorY: snapInfo?.anchorY ?? piece.target.y,
      distance: snapInfo?.distance ?? 0,
      tolerance: snapInfo?.tolerance ?? piece.snapTolerance
    };
    
    console.log(`📤 [placePiece] Emitting placement event for ${piece.id}: anchorX=${eventPayload.anchorX.toFixed(2)}, anchorY=${eventPayload.anchorY.toFixed(2)}, distance=${eventPayload.distance.toFixed(2)}, tolerance=${eventPayload.tolerance.toFixed(2)}, serverAllowed=${(eventPayload.tolerance * 1.15 + 4).toFixed(2)}`);
    
    this.emitter?.emit('puzzle-piece-placed', eventPayload);

    if (this.placedCount === this.pieces.length) {
      const elapsedSeconds = (this.time.now - this.startTime) / 1000;
      this.emitter?.emit('puzzle-complete', { elapsedSeconds });
      
      // Pre-create and prepare the completion video now for instant playback later
      this.prepareCompletionVideo();
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

  /**
   * Render Matter.js collision bodies for debugging
   */
  private renderMatterDebug(): void {
    // DISABLED for cleaner gameplay - re-enable by removing this return
    return;
    
    if (!this.matter || !this.matter.world) {
      return;
    }

    // Create or get debug graphics
    if (!(this as any).matterDebugGraphics) {
      (this as any).matterDebugGraphics = this.add.graphics();
      (this as any).matterDebugGraphics.setDepth(10000);
      (this as any).matterDebugGraphics.setScrollFactor(0);
    }

    const debugGraphics = (this as any).matterDebugGraphics as Phaser.GameObjects.Graphics;
    debugGraphics.clear();
    debugGraphics.setVisible(true);
    debugGraphics.setAlpha(1);

    const world = this.matter.world;
    let bodies: any[] = [];

    // Try multiple ways to access bodies
    if ((world as any).localWorld?.bodies) {
      bodies = (world as any).localWorld.bodies;
    } else if ((world as any).bodies) {
      bodies = (world as any).bodies;
    } else if ((world as any).engine?.world?.bodies) {
      bodies = (world as any).engine.world.bodies;
    }

    if (!bodies || bodies.length === 0) {
      return;
    }

    bodies.forEach((body: any) => {
      if (!body) return;

      // Detect if this is a phantom body
      const isPhantom = body.label && body.label.startsWith('phantom_');
      const isStatic = body.isStatic;
      
      // Color coding:
      // - Phantom bodies: BLUE (they should follow the dragged piece)
      // - Static bodies: RED
      // - Regular bodies: GREEN
      let color: number;
      let lineColor: number;
      let fillAlpha: number;
      let lineWidth: number;
      
      if (isPhantom) {
        color = 0x0088ff;      // Blue for phantoms
        lineColor = 0x66ccff;  // Light blue outline
        fillAlpha = 0.4;       // More visible
        lineWidth = 5;         // Thick to stand out
      } else if (isStatic) {
        color = 0xff0000;      // Red for static
        lineColor = 0xff6666;
        fillAlpha = 0.2;
        lineWidth = 4;
      } else {
        color = 0x00ff00;      // Green for regular
        lineColor = 0x66ff66;
        fillAlpha = 0.3;
        lineWidth = 3;
      }

      const hasCompoundParts = body.parts && body.parts.length > 1;
      
      if (hasCompoundParts) {
        body.parts.forEach((part: any, partIndex: number) => {
          if (partIndex === 0) return;
          if (!part.vertices || part.vertices.length === 0) return;
          this.drawBodyPart(debugGraphics, part, lineWidth, lineColor, color, fillAlpha);
        });
      } else if (body.vertices && body.vertices.length > 0) {
        this.drawBodyPart(debugGraphics, body, lineWidth, lineColor, color, fillAlpha);
      }
    });
  }

  /**
   * Draw a single Matter.js body part (helper method)
   */
  private drawBodyPart(
    graphics: Phaser.GameObjects.Graphics,
    part: any,
    lineWidth: number,
    lineColor: number,
    fillColor: number,
    fillAlpha: number
  ): void {
    if (!part.vertices || part.vertices.length === 0) return;

    // Draw the collision polygon with thick, visible lines
    graphics.lineStyle(lineWidth, lineColor, 1);
    graphics.fillStyle(fillColor, fillAlpha);
    
    graphics.beginPath();
    graphics.moveTo(part.vertices[0].x, part.vertices[0].y);
    
    for (let i = 1; i < part.vertices.length; i++) {
      graphics.lineTo(part.vertices[i].x, part.vertices[i].y);
    }
    
    graphics.closePath();
    graphics.strokePath();
    graphics.fillPath();

    // Draw vertices as dots
    graphics.fillStyle(lineColor, 0.8);
    part.vertices.forEach((vertex: any) => {
      graphics.fillCircle(vertex.x, vertex.y, 3);
    });

    // Draw center point (larger)
    graphics.fillStyle(fillColor, 1);
    graphics.fillCircle(part.position.x, part.position.y, 6);
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

  /**
   * Toggle between simple drag-and-drop and Matter.js physics mode
   */
  togglePhysicsMode(useMatter: boolean): void {
    console.log(`[togglePhysicsMode] Switching to ${useMatter ? 'Matter.js' : 'Simple'} mode`);
    if (!this.matter || !this.matter.world) {
      console.warn('Matter physics not initialized');
      return;
    }

    // Update physics mode flag and save user preference
    this.useMatterPhysics = useMatter;
    this.userPrefersMatterPhysics = useMatter;

    // Access the Matter.js gravity directly
    const world = (this.matter.world as any);
    
    if (useMatter) {
      // Enable Matter.js physics: add gravity
      if (world.engine && world.engine.gravity) {
        world.engine.gravity.y = 1.5;
      } else {
        world.gravity = { x: 0, y: 1.5 };
      }
      console.log('✅ Matter.js physics enabled - pieces will fall with realistic physics');

      // Convert all non-placed pieces to Matter bodies
      let converted = 0;
      this.pieces.forEach((piece) => {
        if (!piece.placed && !piece.isDragging) {
          this.convertToMatterBody(piece);
          converted++;
        }
      });
      console.log(`[togglePhysicsMode] Converted ${converted} pieces to Matter bodies`);
    } else {
      // Disable physics: remove gravity
      if (world.engine && world.engine.gravity) {
        world.engine.gravity.y = 0;
      } else {
        world.gravity = { x: 0, y: 0 };
      }
      console.log('✅ Physics disabled - back to simple drag-and-drop');

      // Remove Matter bodies from all pieces
      let removed = 0;
      this.pieces.forEach((piece) => {
        if (!piece.placed) {
          this.removeMatterBody(piece);
          removed++;
        }
      });
      console.log(`[togglePhysicsMode] Removed ${removed} Matter bodies`);
    }
  }

  private captureMatterAttachment(piece: PieceRuntime, body: any): void {
    const bodyAngle = body.angle ?? 0;
    const dx = piece.shape.x - body.position.x;
    const dy = piece.shape.y - body.position.y;
    const cos = Math.cos(bodyAngle);
    const sin = Math.sin(bodyAngle);
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    if (piece.matterOffset) {
      piece.matterOffset.set(localX, localY);
    } else {
      piece.matterOffset = new Phaser.Math.Vector2(localX, localY);
    }
    piece.matterAngleOffset = piece.shape.rotation - bodyAngle;
  }

  private syncShapeWithMatterBody(piece: PieceRuntime, body: any): void {
    const bodyAngle = body.angle ?? 0;
    const offset = piece.matterOffset;
    let offsetX: number;
    let offsetY: number;
    if (offset) {
      const cos = Math.cos(bodyAngle);
      const sin = Math.sin(bodyAngle);
      offsetX = offset.x * cos - offset.y * sin;
      offsetY = offset.x * sin + offset.y * cos;
    } else {
      offsetX = piece.shape.displayOriginX;
      offsetY = piece.shape.displayOriginY;
    }
    const angleOffset = piece.matterAngleOffset ?? 0;
    piece.shape.setPosition(body.position.x + offsetX, body.position.y + offsetY);
    piece.shape.setRotation(bodyAngle + angleOffset);
    this.syncDetailsTransform(piece);
  }

  private syncMatterBodyWithShape(piece: PieceRuntime, body: any): void {
    if (!this.matter) {
      return;
    }
    const angleOffset = piece.matterAngleOffset ?? 0;
    const targetAngle = piece.shape.rotation - angleOffset;
    this.matter.body.setAngle(body, targetAngle);
    const offset = piece.matterOffset;
    let offsetX: number;
    let offsetY: number;
    if (offset) {
      const cos = Math.cos(targetAngle);
      const sin = Math.sin(targetAngle);
      offsetX = offset.x * cos - offset.y * sin;
      offsetY = offset.x * sin + offset.y * cos;
    } else {
      offsetX = piece.shape.displayOriginX;
      offsetY = piece.shape.displayOriginY;
    }
    
    const targetX = piece.shape.x - offsetX;
    const targetY = piece.shape.y - offsetY;
    
    // CRITICAL: For dragged pieces, ALWAYS sync body position exactly to visual shape
    // The visual shape is authoritative during drag - body must follow it precisely
    // Don't clamp velocity - the increased collision iterations will handle fast movement
    this.matter.body.setPosition(body, {
      x: targetX,
      y: targetY
    });
    
    (body as any).isSleeping = false;
    (body as any).sleepCounter = 0;
    this.captureMatterAttachment(piece, body);
  }

  /**
   * Wake up sleeping bodies near the given body.
   * Sleeping bodies don't check collisions (performance optimization),
   * so we must wake them when a dragged piece approaches.
   */
  private wakeUpNearbyBodies(draggedBody: any, radius: number): void {
    if (!this.matter || !this.matter.world) {
      return;
    }

    const draggedX = draggedBody.position.x;
    const draggedY = draggedBody.position.y;
    
    // Get all bodies in the world
    const allBodies = (this.matter.world as any).localWorld.bodies;
    
    let wokenCount = 0;
    allBodies.forEach((body: any) => {
      // Skip the dragged body itself, static bodies, and already awake bodies
      if (body === draggedBody || body.isStatic || !body.isSleeping) {
        return;
      }
      
      // Check distance between bodies (simple circle check)
      const dx = body.position.x - draggedX;
      const dy = body.position.y - draggedY;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSquared = radius * radius;
      
      if (distanceSquared <= radiusSquared) {
        // Wake up this body
        body.isSleeping = false;
        body.sleepCounter = 0;
        wokenCount++;
      }
    });
    
    // Log occasionally for debugging (only when bodies were woken)
    if (wokenCount > 0 && Math.random() < 0.02) {
      console.log(`⏰ [WAKE] Woke up ${wokenCount} sleeping bodies near dragged piece`);
    }
  }

  /**
   * Apply momentum to nearby pieces when they're pushed by the dragged piece.
   * This creates a more realistic feeling as pieces are shoved aside.
   */
  private applyDragMomentum(draggedPiece: PieceRuntime, draggedBody: any, deltaX: number, deltaY: number): void {
    if (!this.matter || !this.matter.world) {
      return;
    }

    // Only apply momentum if dragged piece is moving
    const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (speed < 0.05) { // Lowered threshold - respond to even slower drags
      return; // Too slow to transfer momentum
    }

    const draggedX = draggedBody.position.x;
    const draggedY = draggedBody.position.y;
    
    // Get all bodies in the world
    const allBodies = (this.matter.world as any).localWorld.bodies;
    
    // Momentum transfer radius - larger for earlier response
    const momentumRadius = 100; // pixels (increased from 80)
    const momentumRadiusSquared = momentumRadius * momentumRadius;
    
    // Calculate drag direction and speed
    const dragDirection = { x: deltaX / speed, y: deltaY / speed };
    const dragSpeed = speed * 60; // Convert to per-second velocity
    
    allBodies.forEach((body: any) => {
      // Skip the dragged body itself and static bodies
      if (body === draggedBody || body.isStatic) {
        return;
      }
      
      // Check distance between bodies
      const dx = body.position.x - draggedX;
      const dy = body.position.y - draggedY;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared <= momentumRadiusSquared && distanceSquared > 0) {
        const distance = Math.sqrt(distanceSquared);
        
        // Calculate push direction (from dragged piece to target)
        const pushDir = { x: dx / distance, y: dy / distance };
        
        // Check if target is in front of drag direction (not behind)
        const dot = pushDir.x * dragDirection.x + pushDir.y * dragDirection.y;
        if (dot <= 0) {
          return; // Target is behind drag direction, don't push
        }
        
        // Calculate momentum based on:
        // 1. How fast the dragged piece is moving (speed-responsive!)
        // 2. How close the target is (closer = more force)
        // 3. How aligned with drag direction (more aligned = more force)
        const proximityFactor = 1 - (distance / momentumRadius); // 1.0 at center, 0.0 at edge
        const alignmentFactor = dot; // 0.0 to 1.0 based on alignment
        
        // Increased multiplier for more noticeable bounce
        // Speed-responsive: faster drag = stronger push
        const baseStrength = dragSpeed * proximityFactor * alignmentFactor;
        const momentumStrength = baseStrength * 0.35; // 35% of drag speed (was 15%)
        
        // Apply impulse in push direction
        const impulseX = pushDir.x * momentumStrength;
        const impulseY = pushDir.y * momentumStrength;
        
        // Convert to Matter.js velocity (impulse is instantaneous change)
        const currentVelX = body.velocity.x;
        const currentVelY = body.velocity.y;
        
        // Add momentum to existing velocity (don't replace it)
        // Increased frame scale for stronger immediate response
        this.matter.body.setVelocity(body, {
          x: currentVelX + impulseX * 0.025, // Increased from 0.016 for more bounce
          y: currentVelY + impulseY * 0.025
        });
        
        // Wake up the body so it responds immediately
        body.isSleeping = false;
        body.sleepCounter = 0;
        
        // Add more angular velocity for spinning effect when pushed hard
        const angularImpulse = (pushDir.x * dragDirection.y - pushDir.y * dragDirection.x) * 0.003; // Tripled from 0.001
        this.matter.body.setAngularVelocity(body, body.angularVelocity + angularImpulse);
      }
    });
  }

  /**
   * Create a phantom sensor body that follows the dragged piece.
   * This body is kinematic (has infinite mass) so it pushes others but isn't affected.
   * Using isSensor:false makes it physically interactive.
   */
  private createPhantomBody(piece: PieceRuntime): void {
    if (!this.matter) {
      console.error('[createPhantomBody] Matter.js not available');
      return;
    }

    const originalBody = (piece as any).matterBody;
    if (!originalBody) {
      console.error('[createPhantomBody] Original body not found');
      return;
    }

    // CRITICAL: Use LOCAL vertices, not world vertices!
    // The original body's vertices are in world coordinates and already rotated.
    // We need to recreate from the piece's local points, just like convertToMatterBody does.
    const localVertices = piece.localPoints.map((pt) => ({ x: pt.x, y: pt.y }));
    

    try {
  const phantomBody = (this.matter.bodies as any).fromVertices(
    0, 0,
    [localVertices],
    {
      isStatic: true,       // absolut solide – keine Bewegung, keine Überschneidung
      isSensor: false,      // echte Kollisionen, keine "ghost hits"
      friction: 1,          // maximale Reibung
      restitution: 0,       // kein Rückprall
      label: `phantom_${piece.id}`
    },
    false,                 // flagInternal
    0.01,                  // vertexMinimumSeparation
    10,                    // quality
    0.01                   // areaTolerance
  );

  if (!phantomBody) {
    throw new Error('fromVertices returned null');
  }
    this.matter.body.setPosition(phantomBody, {
    x: originalBody.position.x,
    y: originalBody.position.y
  });
  this.matter.body.setAngle(phantomBody, originalBody.angle);

  // Debug-Infos
  const positionOffset = Math.hypot(
    phantomBody.position.x - originalBody.position.x,
    phantomBody.position.y - originalBody.position.y
  );

  // Sicherstellen, dass er aktiv bleibt (optional)
  (phantomBody as any).isSleeping = false;
  (phantomBody as any).sleepCounter = 0;
  phantomBody.sleepThreshold = Infinity;

  this.matter.world.add(phantomBody);
  (piece as any).phantomBody = phantomBody;

} catch (error) {
  console.error(`[createPhantomBody] Failed for ${piece.id}:`, error);
}
  }

  /**
   * Remove the phantom body from the world
   */
  private removePhantomBody(piece: PieceRuntime): void {
    const phantomBody = (piece as any).phantomBody;
    if (phantomBody && this.matter) {
      try {
        this.matter.world.remove(phantomBody);
        delete (piece as any).phantomBody;
        console.log(`[removePhantomBody] Removed phantom for ${piece.id}`);
      } catch (error) {
        console.error(`[removePhantomBody] Failed for ${piece.id}:`, error);
      }
    }
  }

  /**
   * Sync phantom body to follow the visual shape position
   * Uses CCD-like approach: if movement is too fast, break it into smaller steps
   */
  private syncPhantomBodyWithShape(piece: PieceRuntime, phantomBody: any): void {
    if (!this.matter) {
      return;
    }

    const angleOffset = piece.matterAngleOffset ?? 0;
    const targetAngle = piece.shape.rotation - angleOffset;
    
    // Debug logging for rotation issues
    if (Math.abs(piece.shape.rotation) > 0.1 || Math.abs(targetAngle - phantomBody.angle) > 0.1) {
      console.log(`[syncPhantom] ${piece.id}: shape.rotation=${(piece.shape.rotation * 180 / Math.PI).toFixed(1)}°, angleOffset=${(angleOffset * 180 / Math.PI).toFixed(1)}°, targetAngle=${(targetAngle * 180 / Math.PI).toFixed(1)}°, currentPhantomAngle=${(phantomBody.angle * 180 / Math.PI).toFixed(1)}°`);
    }
    
    this.matter.body.setAngle(phantomBody, targetAngle);

    const offset = piece.matterOffset;
    let offsetX: number;
    let offsetY: number;
    if (offset) {
      const cos = Math.cos(targetAngle);
      const sin = Math.sin(targetAngle);
      offsetX = offset.x * cos - offset.y * sin;
      offsetY = offset.x * sin + offset.y * cos;
    } else {
      offsetX = piece.shape.displayOriginX;
      offsetY = piece.shape.displayOriginY;
    }

    const targetX = piece.shape.x - offsetX;
    const targetY = piece.shape.y - offsetY;
    
    // PSEUDO-STATIC approach: Directly set position (no CCD needed, phantom doesn't move)
    // The phantom follows the visual shape exactly - it's "kinematic" controlled
    this.matter.body.setPosition(phantomBody, {
      x: targetX,
      y: targetY
    });
    this.matter.body.setAngle(phantomBody, targetAngle);

    // CRITICAL: For pseudo-static dynamic bodies, zero ALL movement EVERY frame
    // This maintains immovability despite collisions with other bodies
    // Dynamic bodies accumulate forces/velocities, so we must clear them constantly
    this.matter.body.setVelocity(phantomBody, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(phantomBody, 0);
    phantomBody.force.x = 0;
    phantomBody.force.y = 0;
    phantomBody.torque = 0;

    // Keep awake and wake up nearby bodies
    (phantomBody as any).isSleeping = false;
    (phantomBody as any).sleepCounter = 0;
    
    // Wake up any bodies the phantom is currently touching
    // This ensures continuous interaction even with sleeping pieces
    if (this.matter.world) {
      const allBodies = (this.matter.world as any).localWorld.bodies;
      allBodies.forEach((body: any) => {
        if (body !== phantomBody && !body.isStatic && body.isSleeping) {
          // Simple bounds check - if bodies overlap, wake the sleeping one
          const boundsOverlap = !(
            phantomBody.bounds.max.x < body.bounds.min.x ||
            phantomBody.bounds.min.x > body.bounds.max.x ||
            phantomBody.bounds.max.y < body.bounds.min.y ||
            phantomBody.bounds.min.y > body.bounds.max.y
          );
          
          if (boundsOverlap) {
            body.isSleeping = false;
            body.sleepCounter = 0;
          }
        }
      });
    }
  }

  private cleanVertices(vertices: { x: number; y: number }[]): { x: number; y: number }[] {
    if (vertices.length === 0) {
      return [];
    }

    const deduped: { x: number; y: number }[] = [];
    const epsilon = 0.08;

    vertices.forEach((point) => {
      const last = deduped[deduped.length - 1];
      if (!last || Math.abs(point.x - last.x) > epsilon || Math.abs(point.y - last.y) > epsilon) {
        deduped.push({ x: point.x, y: point.y });
      }
    });

    if (deduped.length > 2) {
      const first = deduped[0];
      const last = deduped[deduped.length - 1];
      if (Math.abs(first.x - last.x) < epsilon && Math.abs(first.y - last.y) < epsilon) {
        deduped.pop();
      }
    }

    if (deduped.length < 3) {
      return deduped;
    }

    const filtered: { x: number; y: number }[] = [];
    const len = deduped.length;
    for (let i = 0; i < len; i++) {
      const prev = deduped[(i + len - 1) % len];
      const curr = deduped[i];
      const next = deduped[(i + 1) % len];
      const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
      if (Math.abs(cross) > 1e-3) {
        filtered.push(curr);
      }
    }

    if (filtered.length < 3) {
      return deduped;
    }

    let area = 0;
    for (let i = 0; i < filtered.length; i++) {
      const j = (i + 1) % filtered.length;
      area += filtered[i].x * filtered[j].y - filtered[j].x * filtered[i].y;
    }

    if (area < 0) {
      filtered.reverse();
    }

    return filtered;
  }

  private releaseDragConstraint(piece: PieceRuntime): void {
    if (piece.dragConstraint && this.matter) {
      try {
        this.matter.world.removeConstraint(piece.dragConstraint);
      } catch (error) {
        console.warn('[releaseDragConstraint] Failed to remove constraint', error);
      }
      piece.dragConstraint = undefined;
    }
  }

  /**
   * Convert a puzzle piece to a Matter.js physics body
   */
  private convertToMatterBody(piece: PieceRuntime): void {
    if (!this.matter) {
      console.error(`⚙️ [CONVERT] ${piece.id}: ❌ Matter.js not available!`);
      return;
    }
    
    if ((piece as any).matterBody) {
      return; // Silent skip if already has body
    }

    // Get the actual vertices from the piece shape (relative to puzzle anchor)
    const localVertices = piece.localPoints.map((pt) => ({ x: pt.x, y: pt.y }));
    const anchorX = piece.shape.x - piece.shape.displayOriginX;
    const anchorY = piece.shape.y - piece.shape.displayOriginY;
    let body: any = null;

    try {
      let usableVertices = this.cleanVertices(localVertices);
      if (piece.id === 'piece_7') {
        console.log(`🟢 [piece_7] raw vertices=${localVertices.length}`);
      }
      if (usableVertices.length < 3) {
        console.warn(`⚠️ [CONVERT] ${piece.id}: Cleaned vertex count ${usableVertices.length}, falling back to raw outline (${localVertices.length})`);
        usableVertices = [...localVertices];
      }
      if (usableVertices.length < 3) {
        throw new Error(`Not enough usable vertices (${usableVertices.length})`);
      }
      if (piece.id === 'piece_7') {
        console.log(`🟢 [piece_7] usable vertices=${usableVertices.length}`);
      }

      const worldVertices = usableVertices.map((v) => ({
        x: anchorX + v.x,
        y: anchorY + v.y
      }));

      const pieceIndex = this.pieces.indexOf(piece);
      if (pieceIndex < 3 || piece.id === 'piece_7') {
        console.log(`🔍 [ANCHOR] Piece ${pieceIndex}:`);
        console.log(`  - shape.x/y: (${piece.shape.x.toFixed(1)}, ${piece.shape.y.toFixed(1)})`);
        console.log(`  - displayOrigin: (${piece.shape.displayOriginX.toFixed(1)}, ${piece.shape.displayOriginY.toFixed(1)})`);
        console.log(`  - anchor (corrected): (${anchorX.toFixed(1)}, ${anchorY.toFixed(1)})`);
        console.log(`  - restPosition: (${piece.restPosition?.x.toFixed(1)}, ${piece.restPosition?.y.toFixed(1)})`);
      }

      body = (this.matter.bodies as any).fromVertices(
        anchorX,
        anchorY,
        [worldVertices],
        {
          restitution: 0.2,      // Reduced bounce for more solid feel
          friction: 1.0,         // Increased friction to prevent sliding through
          frictionStatic: 1.2,   // High static friction
          frictionAir: 0.01,
          density: 0.003,        // Slightly increased density for better collision
          angle: piece.shape.rotation,
          isStatic: false,
          slop: 0.02,            // Reduced slop for tighter collisions
          label: `piece_${piece.id}`
        },
        false,
        0.01,                    // Remove collinear points threshold
        10,                      // Decomposition threshold
        0.01                     // Minimum area
      );

      if (!body || !body.position) {
        throw new Error('fromVertices returned invalid body');
      }

      this.matter.world.add(body);

      const actualBodyX = body.position.x;
      const actualBodyY = body.position.y;
      const partCount = body.parts ? body.parts.length - 1 : 0;

      if (this.pieces.filter(p => (p as any).matterBody).length < 3 || piece.id === 'piece_7') {
        console.log(`⚙️ [BODY] ${piece.id}: ✅ ${localVertices.length}→${usableVertices.length} vertices, ${partCount} parts`);
        console.log(`⚙️ [BODY] ${piece.id}: Anchor=(${anchorX.toFixed(1)}, ${anchorY.toFixed(1)}), Body=(${actualBodyX.toFixed(1)}, ${actualBodyY.toFixed(1)})`);

        if (body.vertices && body.vertices.length > 0) {
          console.log(`⚙️ [BODY] ${piece.id}: Body has ${body.vertices.length} vertices, first 3:`,
            body.vertices.slice(0, 3).map((v: any) => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', ')
          );
        }
      }
      
    } catch (error) {
      console.error(`⚙️ [CONVERT] ${piece.id}: ❌ fromVertices failed:`, error);
      
      const bounds = piece.shape.getBounds();
      body = this.matter.add.rectangle(
        anchorX,
        anchorY,
        bounds.width * 0.8,
        bounds.height * 0.8,
        {
          restitution: 0.3,
          friction: 0.9,
          frictionAir: 0.01,
          density: 0.002,
          angle: piece.shape.rotation,
          isStatic: false,
          label: `piece_${piece.id}_rect`
        }
      );
      
      console.log(`⚙️ [CONVERT] ${piece.id}: Using rectangle fallback`);
    }

    if (body) {
      // Ensure body is awake
      (body as any).isSleeping = false;
      (body as any).sleepCounter = 0;
      
      this.captureMatterAttachment(piece, body);
      this.syncShapeWithMatterBody(piece, body);
      // Store bidirectional references
      (piece as any).matterBody = body;
      (body as any).gameObject = piece.shape;
      piece.shape.setData('matterBody', body);
      piece.shape.setData('pieceRuntime', piece);
    }
  }

  /**
   * Remove Matter.js physics body from a piece
   */
  private removeMatterBody(piece: PieceRuntime): void {
    const matterBody = (piece as any).matterBody;
    if (matterBody && this.matter && this.matter.world) {
      this.releaseDragConstraint(piece);
      this.matter.world.remove(matterBody);
      (piece as any).matterBody = undefined;
      piece.shape.setData('matterBody', undefined);
      piece.matterOffset = undefined;
      piece.matterAngleOffset = undefined;
    }
  }

}
