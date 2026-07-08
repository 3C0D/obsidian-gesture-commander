import type { Point } from './types.ts';

function dist(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleBetween(a: Point, b: Point, c: Point): number {
  const ax = a.x - b.x,
    ay = a.y - b.y;
  const cx = c.x - b.x,
    cy = c.y - b.y;
  const dot = ax * cx + ay * cy;
  const mag = Math.sqrt((ax * ax + ay * ay) * (cx * cx + cy * cy));
  if (mag === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/** Ramer–Douglas–Peucker simplification */
function rdp(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  for (let i = 1; i < points.length - 1; i++) {
    const d =
      len === 0
        ? dist(points[i], first)
        : Math.abs(
            dy * points[i].x - dx * points[i].y + last.x * first.y - last.y * first.x
          ) / len;
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > tolerance) {
    const left = rdp(points.slice(0, maxIdx + 1), tolerance);
    const right = rdp(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

/** Centered moving average over a window of 3 */
function smoothSegment(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    result.push({
      x: (points[i - 1].x + points[i].x + points[i + 1].x) / 3,
      y: (points[i - 1].y + points[i].y + points[i + 1].y) / 3
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Stabilizes a stroke by detecting corners, then per segment either
 * straightening (RDP) or smoothing (moving average).
 *
 * @param points               Raw captured points
 * @param cornerAngleThreshold Angle in degrees below which a point is a corner (default 40)
 * @param straightLineTolerance Max perpendicular deviation in px to consider a segment straight (default 4)
 */
// Runs once, after the stroke is finished (not live during drawing) —
// corner detection needs to see points ahead of any given point to know
// whether it's a deliberate turn or just hand tremor, so it can't work
// point-by-point in real time.
export function stabilizeStroke(
  points: Point[],
  cornerAngleThreshold: number,
  straightLineTolerance: number
): Point[] {
  if (points.length < 3) return points;

  // Detect corner indices (excluding first and last)
  const corners: number[] = [0];
  for (let i = 1; i < points.length - 1; i++) {
    const angle = angleBetween(points[i - 1], points[i], points[i + 1]);
    if (angle < cornerAngleThreshold) {
      corners.push(i);
    }
  }
  corners.push(points.length - 1);

  // Process each segment between consecutive corners
  const result: Point[] = [];
  for (let s = 0; s < corners.length - 1; s++) {
    const start = corners[s];
    const end = corners[s + 1];
    // Corner point is shared: include it as junction
    const segment = points.slice(start, end + 1);

    // Measure max perpendicular deviation to decide strategy
    const simplified = rdp(segment, straightLineTolerance);
    const isNearStraight = simplified.length === 2;

    const processed = isNearStraight ? simplified : smoothSegment(segment);

    // Avoid duplicating the junction point between segments
    if (s === 0) {
      result.push(...processed);
    } else {
      result.push(...processed.slice(1));
    }
  }

  return result;
}
