import Phaser from 'phaser';

import {
  STAG_BASE_COLOR,
  DEFAULT_FILL_ALPHA,
  DEFAULT_STROKE_ALPHA,
  SVG_SAMPLING_MAX_STEP,
  SVG_SAMPLING_MIN_STEPS,
  SVG_SAMPLING_MAX_STEPS
} from './puzzle.constants';
import {
  PuzzleConfig,
  PuzzlePiece,
  PuzzlePoint,
  PuzzleBounds,
  SvgStyleAttributes
} from './puzzle.types';

export const createPuzzleConfigFromSvg = (documentNode: Document): PuzzleConfig => {
  const root = documentNode.documentElement;
  const viewBoxRaw = root.getAttribute('viewBox');

  if (!viewBoxRaw) {
    throw new Error('SVG viewBox is required to normalise coordinates.');
  }

  const viewBoxValues = viewBoxRaw.split(/[\s,]+/).map(Number);
  if (viewBoxValues.length !== 4 || viewBoxValues.some((value) => Number.isNaN(value))) {
    throw new Error('SVG viewBox is invalid.');
  }

  const outlineElement = documentNode.querySelector<SVGPathElement>('#outline');
  if (!outlineElement) {
    throw new Error('SVG outline path not found.');
  }

  const outlinePoints = sampleSvgPath(outlineElement);
  const classStyleMap = extractClassStyleMap(documentNode);
  const outlineStyle = extractStyleFromElement(outlineElement, classStyleMap);
  const pieceElements = Array.from(documentNode.querySelectorAll<SVGPathElement>('[id^="piece_"]'));

  if (pieceElements.length === 0) {
    throw new Error('No puzzle pieces found in SVG.');
  }

  const pieces = pieceElements
    .map<PuzzlePiece | null>((element) => {
      const d = element.getAttribute('d');
      if (!d) {
        return null;
      }

      const points = sampleSvgPath(element);
      if (points.length < 3) {
        return null;
      }

      const anchor = computeCentroid(points);
      const styleInfo = extractStyleFromElement(element, classStyleMap);
      const fillColor = styleInfo.fillColor ?? STAG_BASE_COLOR;
      const fillAlpha = styleInfo.fillAlpha ?? DEFAULT_FILL_ALPHA;
      const strokeColor = styleInfo.strokeColor;
      const strokeAlpha = styleInfo.strokeAlpha ?? DEFAULT_STROKE_ALPHA;
      const strokeWidth = styleInfo.strokeWidth;

      return {
        id: element.id,
        points,
        anchor,
        fillColor,
        fillAlpha,
        strokeColor,
        strokeAlpha,
        strokeWidth
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

  const bounds = computeBounds(outlinePoints, pieces);

  return { outline: outlinePoints, outlineStyle, pieces, bounds };
};

const extractClassStyleMap = (documentNode: Document): Map<string, SvgStyleAttributes> => {
  const styleEntries = new Map<string, SvgStyleAttributes>();
  const styleElements = Array.from(documentNode.querySelectorAll('style'));
  const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;

  styleElements.forEach((styleEl) => {
    const css = styleEl.textContent ?? '';
    let match: RegExpExecArray | null;
    while ((match = ruleRegex.exec(css)) !== null) {
      const className = match[1];
      const declarations = match[2];
      const fillMatch = /fill\s*:\s*([^;]+)/i.exec(declarations);
      const fillOpacityMatch = /fill-opacity\s*:\s*([^;]+)/i.exec(declarations);
      const strokeMatch = /stroke\s*:\s*([^;]+)/i.exec(declarations);
      const strokeOpacityMatch = /stroke-opacity\s*:\s*([^;]+)/i.exec(declarations);
      const strokeWidthMatch = /stroke-width\s*:\s*([^;]+)/i.exec(declarations);
      const fillColor = parseColorValue(fillMatch?.[1]);
      const fillAlpha = fillOpacityMatch ? parseAlphaValue(fillOpacityMatch[1]) : undefined;
      const strokeColor = parseColorValue(strokeMatch?.[1]);
      const strokeAlpha = strokeOpacityMatch ? parseAlphaValue(strokeOpacityMatch[1]) : undefined;
      const strokeWidth = strokeWidthMatch ? parseLengthValue(strokeWidthMatch[1]) : undefined;
      styleEntries.set(className, { fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth });
    }
  });

  return styleEntries;
};

const extractStyleFromElement = (
  element: SVGPathElement,
  classStyleMap: Map<string, SvgStyleAttributes>
): SvgStyleAttributes => {
  const fillAttr = element.getAttribute('fill');
  const fillOpacityAttr = element.getAttribute('fill-opacity');
  const strokeAttr = element.getAttribute('stroke');
  const strokeOpacityAttr = element.getAttribute('stroke-opacity');
  const strokeWidthAttr = element.getAttribute('stroke-width');
  let fillColor = parseColorValue(fillAttr);
  let fillAlpha = fillOpacityAttr ? parseAlphaValue(fillOpacityAttr) : undefined;
  let strokeColor = parseColorValue(strokeAttr);
  let strokeAlpha = strokeOpacityAttr ? parseAlphaValue(strokeOpacityAttr) : undefined;
  let strokeWidth = parseLengthValue(strokeWidthAttr);

  const styleAttr = element.getAttribute('style');
  if (styleAttr) {
    const inlineFill = /fill\s*:\s*([^;]+)/i.exec(styleAttr);
    const inlineOpacity = /fill-opacity\s*:\s*([^;]+)/i.exec(styleAttr);
    const inlineStroke = /stroke\s*:\s*([^;]+)/i.exec(styleAttr);
    const inlineStrokeOpacity = /stroke-opacity\s*:\s*([^;]+)/i.exec(styleAttr);
    const inlineStrokeWidth = /stroke-width\s*:\s*([^;]+)/i.exec(styleAttr);
    fillColor = inlineFill ? parseColorValue(inlineFill[1]) ?? fillColor : fillColor;
    fillAlpha = inlineOpacity ? parseAlphaValue(inlineOpacity[1]) ?? fillAlpha : fillAlpha;
    strokeColor = inlineStroke ? parseColorValue(inlineStroke[1]) ?? strokeColor : strokeColor;
    strokeAlpha = inlineStrokeOpacity ? parseAlphaValue(inlineStrokeOpacity[1]) ?? strokeAlpha : strokeAlpha;
    strokeWidth = inlineStrokeWidth ? parseLengthValue(inlineStrokeWidth[1]) ?? strokeWidth : strokeWidth;
  }

  element.classList.forEach((className) => {
    const classStyle = classStyleMap.get(className);
    if (!classStyle) {
      return;
    }
    if (classStyle.fillColor !== undefined) fillColor = classStyle.fillColor;
    if (classStyle.fillAlpha !== undefined) fillAlpha = classStyle.fillAlpha;
    if (classStyle.strokeColor !== undefined) strokeColor = classStyle.strokeColor;
    if (classStyle.strokeAlpha !== undefined) strokeAlpha = classStyle.strokeAlpha;
    if (classStyle.strokeWidth !== undefined) strokeWidth = classStyle.strokeWidth;
  });

  return { fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth };
};

export const sampleSvgPath = (pathElement: SVGPathElement): PuzzlePoint[] => {
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

  const estimatedSteps = Math.ceil(totalLength / SVG_SAMPLING_MAX_STEP);
  const steps = Phaser.Math.Clamp(estimatedSteps, SVG_SAMPLING_MIN_STEPS, SVG_SAMPLING_MAX_STEPS);
  const points: PuzzlePoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const distance = (i / steps) * totalLength;
    const { x, y } = path.getPointAtLength(distance);
    points.push({ x: round(x), y: round(y) });
  }

  return compactPoints(points);
};

const compactPoints = (points: PuzzlePoint[], epsilon = 1e-4): PuzzlePoint[] => {
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
};

const computeCentroid = (points: PuzzlePoint[]): PuzzlePoint => {
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
};

const computeBounds = (outline: PuzzlePoint[], pieces: PuzzlePiece[]): PuzzleBounds => {
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
};

const round = (value: number): number => {
  const factor = 1_000_000;
  if (value === 0) {
    return 0;
  }
  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
};

const parseColorValue = (value?: string | null): number | undefined => {
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
};

const parseAlphaValue = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const alpha = Number.parseFloat(value.trim());
  if (!Number.isFinite(alpha)) {
    return undefined;
  }
  return Phaser.Math.Clamp(alpha, 0, 1);
};

const parseLengthValue = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const numeric = Number.parseFloat(value.trim());
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.max(numeric, 0);
};
