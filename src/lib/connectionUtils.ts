import type { HandleSide, CommCardPosition, CanvasEquipment } from '@/types/equipment';

/**
 * Calculate the intersection point of a line from the center of a rectangle
 * to an external point, with the rectangle's border.
 */
export function getEdgeIntersection(
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const centerX = rectX + rectWidth / 2;
  const centerY = rectY + rectHeight / 2;
  const halfWidth = rectWidth / 2;
  const halfHeight = rectHeight / 2;

  const dx = targetX - centerX;
  const dy = targetY - centerY;

  if (dx === 0 && dy === 0) {
    return { x: centerX, y: centerY };
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let scale: number;

  if (absDx * halfHeight > absDy * halfWidth) {
    scale = halfWidth / absDx;
  } else {
    scale = halfHeight / absDy;
  }

  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  };
}

interface HandleCoords {
  x: number;
  y: number;
  side: HandleSide;
}

/**
 * Get the 4 handle positions (center of each edge) for an equipment card
 */
function getHandlePositions(
  equipmentX: number,
  equipmentY: number,
  cardWidth: number,
  cardHeight: number
): HandleCoords[] {
  return [
    { side: 'top', x: equipmentX + cardWidth / 2, y: equipmentY },
    { side: 'right', x: equipmentX + cardWidth, y: equipmentY + cardHeight / 2 },
    { side: 'bottom', x: equipmentX + cardWidth / 2, y: equipmentY + cardHeight },
    { side: 'left', x: equipmentX, y: equipmentY + cardHeight / 2 },
  ];
}

/**
 * Get handle position for a specific side
 */
export function getHandlePosition(
  equipmentX: number,
  equipmentY: number,
  cardWidth: number,
  cardHeight: number,
  side: HandleSide
): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: equipmentX + cardWidth / 2, y: equipmentY };
    case 'right':
      return { x: equipmentX + cardWidth, y: equipmentY + cardHeight / 2 };
    case 'bottom':
      return { x: equipmentX + cardWidth / 2, y: equipmentY + cardHeight };
    case 'left':
      return { x: equipmentX, y: equipmentY + cardHeight / 2 };
  }
}

/**
 * Get the bounds (x, y, width, height) of a comm card relative to the canvas.
 */
export function getCommCardBounds(
  equipment: { x: number; y: number },
  cardWidth: number,
  cardHeight: number,
  commCardPosition: CommCardPosition = 'right'
): { x: number; y: number; width: number; height: number } {
  const overlap = 8;
  const commW = 70;
  const commH = 55;

  switch (commCardPosition) {
    case 'right':
      return { x: equipment.x + cardWidth - overlap, y: equipment.y + cardHeight / 2 - commH / 2, width: commW, height: commH };
    case 'left':
      return { x: equipment.x - commW + overlap, y: equipment.y + cardHeight / 2 - commH / 2, width: commW, height: commH };
    case 'top':
      return { x: equipment.x + cardWidth / 2 - commW / 2, y: equipment.y - commH + overlap, width: commW, height: commH };
    case 'bottom':
      return { x: equipment.x + cardWidth / 2 - commW / 2, y: equipment.y + cardHeight - overlap, width: commW, height: commH };
  }
}

/**
 * Get the connection endpoints attached to the closest handles of equipment cards.
 * Supports different dimensions for source and target cards.
 * When fromCommCard flags are set, uses comm card bounds instead.
 */
export function getConnectionEndpoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
  sourceCardWidth: number,
  sourceCardHeight: number = 80,
  sourceHandle?: HandleSide,
  targetHandle?: HandleSide,
  targetCardWidth?: number,
  targetCardHeight?: number,
  sourceFromCommCard?: boolean,
  targetFromCommCard?: boolean,
  sourceEquipment?: CanvasEquipment,
  targetEquipment?: CanvasEquipment
): { sourceX: number; sourceY: number; targetX: number; targetY: number; sourceSide: HandleSide; targetSide: HandleSide } {
  const tWidth = targetCardWidth ?? sourceCardWidth;
  const tHeight = targetCardHeight ?? sourceCardHeight;

  // Determine effective bounds for source
  let sX = source.x, sY = source.y, sW = sourceCardWidth, sH = sourceCardHeight;
  if (sourceFromCommCard && sourceEquipment) {
    const bounds = getCommCardBounds(source, sourceCardWidth, sourceCardHeight, sourceEquipment.commCardPosition || 'right');
    sX = bounds.x; sY = bounds.y; sW = bounds.width; sH = bounds.height;
  }

  // Determine effective bounds for target
  let tX = target.x, tY = target.y, tW2 = tWidth, tH2 = tHeight;
  if (targetFromCommCard && targetEquipment) {
    const bounds = getCommCardBounds(target, tWidth, tHeight, targetEquipment.commCardPosition || 'right');
    tX = bounds.x; tY = bounds.y; tW2 = bounds.width; tH2 = bounds.height;
  }

  // If handles are specified, use them directly
  if (sourceHandle && targetHandle) {
    const sourcePos = getHandlePosition(sX, sY, sW, sH, sourceHandle);
    const targetPos = getHandlePosition(tX, tY, tW2, tH2, targetHandle);
    return {
      sourceX: sourcePos.x,
      sourceY: sourcePos.y,
      targetX: targetPos.x,
      targetY: targetPos.y,
      sourceSide: sourceHandle,
      targetSide: targetHandle,
    };
  }

  const sourceHandles = getHandlePositions(sX, sY, sW, sH);
  const targetHandles = getHandlePositions(tX, tY, tW2, tH2);

  let minDist = Infinity;
  let bestSource = sourceHandles[0];
  let bestTarget = targetHandles[0];

  for (const sh of sourceHandles) {
    for (const th of targetHandles) {
      const dx = th.x - sh.x;
      const dy = th.y - sh.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        bestSource = sh;
        bestTarget = th;
      }
    }
  }

  return {
    sourceX: bestSource.x,
    sourceY: bestSource.y,
    targetX: bestTarget.x,
    targetY: bestTarget.y,
    sourceSide: bestSource.side,
    targetSide: bestTarget.side,
  };
}

/**
 * Get the direction vector for a handle side (pointing outward from the equipment)
 */
function getHandleDirection(side: HandleSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':
      return { dx: 0, dy: -1 };
    case 'right':
      return { dx: 1, dy: 0 };
    case 'bottom':
      return { dx: 0, dy: 1 };
    case 'left':
      return { dx: -1, dy: 0 };
  }
}

/**
 * Generate an orthogonal (elbow) path between two handles.
 */
export function getOrthogonalPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceSide: HandleSide,
  targetSide: HandleSide,
  offset: number = 30,
  controlPoint?: { x: number; y: number }
): string {
  const sourceDir = getHandleDirection(sourceSide);
  const targetDir = getHandleDirection(targetSide);

  const cp1x = sourceX + sourceDir.dx * offset;
  const cp1y = sourceY + sourceDir.dy * offset;

  const cp2x = targetX + targetDir.dx * offset;
  const cp2y = targetY + targetDir.dy * offset;

  const isHorizontalSource = sourceSide === 'left' || sourceSide === 'right';
  const isHorizontalTarget = targetSide === 'left' || targetSide === 'right';

  const midX = controlPoint ? controlPoint.x : (cp1x + cp2x) / 2;
  const midY = controlPoint ? controlPoint.y : (cp1y + cp2y) / 2;

  let path = `M ${sourceX} ${sourceY} L ${cp1x} ${cp1y}`;

  if (isHorizontalSource && isHorizontalTarget) {
    path += ` L ${midX} ${cp1y} L ${midX} ${cp2y} L ${cp2x} ${cp2y}`;
  } else if (!isHorizontalSource && !isHorizontalTarget) {
    path += ` L ${cp1x} ${midY} L ${cp2x} ${midY} L ${cp2x} ${cp2y}`;
  } else if (isHorizontalSource && !isHorizontalTarget) {
    path += ` L ${midX} ${cp1y} L ${midX} ${cp2y} L ${cp2x} ${cp2y}`;
  } else {
    path += ` L ${cp1x} ${midY} L ${cp2x} ${midY} L ${cp2x} ${cp2y}`;
  }

  path += ` L ${targetX} ${targetY}`;

  return path;
}

/**
 * Find the best handles to use for a connection between two equipment cards.
 */
export function findBestHandles(
  source: { x: number; y: number },
  target: { x: number; y: number },
  cardWidth: number,
  cardHeight: number
): { sourceSide: HandleSide; targetSide: HandleSide } {
  const result = getConnectionEndpoints(source, target, cardWidth, cardHeight);
  return {
    sourceSide: result.sourceSide,
    targetSide: result.targetSide,
  };
}

// ─── Label positioning along SVG paths ───────────────────────────────────

interface PathSegment {
  type: 'M' | 'L' | 'C' | 'H' | 'V';
  points: number[];
}

function parsePathSegments(pathStr: string): PathSegment[] {
  const segments: PathSegment[] = [];
  // Match command letter followed by numbers (possibly negative/decimal)
  const re = /([MLCHVCSQTAZ])\s*([-\d.,e\s]*)/gi;
  let match: RegExpExecArray | null;
  let curX = 0, curY = 0;

  while ((match = re.exec(pathStr)) !== null) {
    const cmd = match[1].toUpperCase() as PathSegment['type'];
    const nums = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    switch (cmd) {
      case 'M':
        curX = nums[0]; curY = nums[1];
        segments.push({ type: 'M', points: [curX, curY] });
        break;
      case 'L':
        segments.push({ type: 'L', points: [curX, curY, nums[0], nums[1]] });
        curX = nums[0]; curY = nums[1];
        break;
      case 'H':
        segments.push({ type: 'L', points: [curX, curY, nums[0], curY] });
        curX = nums[0];
        break;
      case 'V':
        segments.push({ type: 'L', points: [curX, curY, curX, nums[0]] });
        curY = nums[0];
        break;
      case 'C':
        segments.push({ type: 'C', points: [curX, curY, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]] });
        curX = nums[4]; curY = nums[5];
        break;
    }
  }
  return segments;
}

function sampleLineSegment(x0: number, y0: number, x1: number, y1: number, t: number) {
  return {
    x: x0 + (x1 - x0) * t,
    y: y0 + (y1 - y0) * t,
    dx: x1 - x0,
    dy: y1 - y0,
  };
}

function sampleCubicBezier(
  x0: number, y0: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x1: number, y1: number,
  t: number,
) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * x0 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t2 * t * x1,
    y: mt2 * mt * y0 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t2 * t * y1,
    dx: 3 * mt2 * (cx1 - x0) + 6 * mt * t * (cx2 - cx1) + 3 * t2 * (x1 - cx2),
    dy: 3 * mt2 * (cy1 - y0) + 6 * mt * t * (cy2 - cy1) + 3 * t2 * (y1 - cy2),
  };
}

function segmentLength(seg: PathSegment, steps = 20): number {
  if (seg.type === 'M') return 0;
  let len = 0;
  let prevX = 0, prevY = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let pt: { x: number; y: number };
    if (seg.type === 'L') {
      pt = sampleLineSegment(seg.points[0], seg.points[1], seg.points[2], seg.points[3], t);
    } else {
      pt = sampleCubicBezier(
        seg.points[0], seg.points[1], seg.points[2], seg.points[3],
        seg.points[4], seg.points[5], seg.points[6], seg.points[7], t,
      );
    }
    if (i > 0) {
      const dx = pt.x - prevX;
      const dy = pt.y - prevY;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    prevX = pt.x;
    prevY = pt.y;
  }
  return len;
}

/**
 * Get a point and tangent on an SVG path at parameter t (0..1).
 */
export function getPointOnPath(pathStr: string, t: number): { x: number; y: number; dx: number; dy: number } {
  const segments = parsePathSegments(pathStr);
  const drawSegments = segments.filter(s => s.type !== 'M');
  if (drawSegments.length === 0) {
    // Fallback: return the M point
    const m = segments.find(s => s.type === 'M');
    return { x: m?.points[0] ?? 0, y: m?.points[1] ?? 0, dx: 1, dy: 0 };
  }

  // Compute cumulative lengths
  const lengths = drawSegments.map(s => segmentLength(s));
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  if (totalLength === 0) {
    const seg = drawSegments[0];
    return { x: seg.points[0], y: seg.points[1], dx: 1, dy: 0 };
  }

  const targetLen = Math.max(0, Math.min(1, t)) * totalLength;
  let accumulated = 0;

  for (let i = 0; i < drawSegments.length; i++) {
    if (accumulated + lengths[i] >= targetLen || i === drawSegments.length - 1) {
      const localT = lengths[i] > 0 ? (targetLen - accumulated) / lengths[i] : 0;
      const seg = drawSegments[i];
      if (seg.type === 'L') {
        return sampleLineSegment(seg.points[0], seg.points[1], seg.points[2], seg.points[3], localT);
      } else {
        return sampleCubicBezier(
          seg.points[0], seg.points[1], seg.points[2], seg.points[3],
          seg.points[4], seg.points[5], seg.points[6], seg.points[7], localT,
        );
      }
    }
    accumulated += lengths[i];
  }

  // Should never reach here
  return { x: 0, y: 0, dx: 1, dy: 0 };
}

/**
 * Get perpendicular offset vector from a tangent direction.
 */
export function getPerpendicularOffset(dx: number, dy: number, offset: number): { x: number; y: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: -offset };
  // Perpendicular: rotate tangent 90° CCW => (-dy, dx)
  return {
    x: (-dy / len) * offset,
    y: (dx / len) * offset,
  };
}

/**
 * Project a mouse position onto a path and return the closest t and signed perpendicular distance.
 */
export function projectMouseOnPath(
  mouseX: number,
  mouseY: number,
  pathStr: string,
  steps = 80,
): { t: number; perpDistance: number } {
  let bestT = 0.5;
  let bestDist = Infinity;
  let bestPerpDist = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = getPointOnPath(pathStr, t);
    const ex = mouseX - pt.x;
    const ey = mouseY - pt.y;
    const dist = ex * ex + ey * ey;

    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;

      // Compute signed perpendicular distance
      const len = Math.sqrt(pt.dx * pt.dx + pt.dy * pt.dy);
      if (len > 0) {
        // Cross product gives signed distance
        bestPerpDist = (ex * (-pt.dy) + ey * pt.dx) / len;
      }
    }
  }

  return { t: bestT, perpDistance: bestPerpDist };
}
