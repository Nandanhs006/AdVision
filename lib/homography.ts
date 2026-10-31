import { Point2D } from "./schema";

/**
 * Computes the 3x3 projective transformation matrix H that maps unit square
 * (0,0), (1,0), (1,1), (0,1) to quad points (x0,y0), (x1,y1), (x2,y2), (x3,y3)
 * and formats it as a CSS matrix3d() string.
 */
export function getQuadMatrix3d(quad: Point2D[], width = 100, height = 100): string {
  if (quad.length !== 4) {
    return "matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1)";
  }

  // Multiply normalized coordinates by display dimensions
  const p0 = { x: quad[0].x * width, y: quad[0].y * height };
  const p1 = { x: quad[1].x * width, y: quad[1].y * height };
  const p2 = { x: quad[2].x * width, y: quad[2].y * height };
  const p3 = { x: quad[3].x * width, y: quad[3].y * height };

  const dx1 = p1.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dx2 = p3.x - p2.x;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-7) {
    // Affine fallback
    return `matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, ${p0.x},${p0.y},0,1)`;
  }

  const g = (sx * dy2 - sy * dx2) / det;
  const h = (dx1 * sy - dy1 * sx) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;

  // Normalized to unit input [0..1]
  // In CSS matrix3d(a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3, a4, b4, c4, d4) (column-major)
  const m00 = a / width;
  const m10 = d / width;
  const m30 = g / width;

  const m01 = b / height;
  const m11 = e / height;
  const m31 = h / height;

  const m03 = c;
  const m13 = f;
  const m33 = 1;

  return `matrix3d(${m00.toFixed(6)}, ${m10.toFixed(6)}, 0, ${m30.toFixed(6)}, ${m01.toFixed(6)}, ${m11.toFixed(6)}, 0, ${m31.toFixed(6)}, 0, 0, 1, 0, ${m03.toFixed(2)}, ${m13.toFixed(2)}, 0, ${m33})`;
}

/**
 * Calculates the polygon area of a normalized 4-point quadrilateral (Shoelace formula)
 * Returning frame share between 0 and 1
 */
export function calculateQuadArea(quad: Point2D[]): number {
  if (quad.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < quad.length; i++) {
    const j = (i + 1) % quad.length;
    area += quad[i].x * quad[j].y;
    area -= quad[j].x * quad[i].y;
  }
  return Math.max(0, Math.min(1, Math.abs(area) / 2));
}
