import { Point2D } from "./schema";

/**
 * Computes the 3D projective transformation matrix mapping an element of
 * dimensions (srcWidth x srcHeight) to normalized quadrilateral coordinates
 * quad: [TL, TR, BR, BL] scaled by (containerWidth x containerHeight).
 *
 * Output format: CSS matrix3d(a1, b1, 0, d1, a2, b2, 0, d2, 0, 0, 1, 0, a4, b4, 0, d4)
 */
export function getQuadMatrix3d(
  quad: Point2D[],
  containerWidth: number,
  containerHeight: number,
  srcWidth = 300,
  srcHeight = 200
): string {
  if (quad.length !== 4 || containerWidth <= 0 || containerHeight <= 0) {
    return "matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1)";
  }

  // Destination corner points in container pixel space
  // p0: Top-Left, p1: Top-Right, p2: Bottom-Right, p3: Bottom-Left
  const p0 = { x: quad[0].x * containerWidth, y: quad[0].y * containerHeight };
  const p1 = { x: quad[1].x * containerWidth, y: quad[1].y * containerHeight };
  const p2 = { x: quad[2].x * containerWidth, y: quad[2].y * containerHeight };
  const p3 = { x: quad[3].x * containerWidth, y: quad[3].y * containerHeight };

  // Projective transform mapping unit square (0,0)-(1,0)-(1,1)-(0,1) to p0-p1-p2-p3
  const dx1 = p1.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dx2 = p3.x - p2.x;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-7) {
    // Affine fallback
    return `matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, ${p0.x.toFixed(2)},${p0.y.toFixed(2)},0,1)`;
  }

  const g = (sx * dy2 - sy * dx2) / det;
  const h = (dx1 * sy - dy1 * sx) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;

  // Scale coefficients from unit square [0,1] to element dimensions [srcWidth, srcHeight]
  const m11 = a / srcWidth;   // scale X
  const m12 = d / srcWidth;   // skew Y
  const m14 = g / srcWidth;   // persp X

  const m21 = b / srcHeight;  // skew X
  const m22 = e / srcHeight;  // scale Y
  const m24 = h / srcHeight;  // persp Y

  const m41 = c;              // translate X
  const m42 = f;              // translate Y
  const m44 = 1;

  // CSS matrix3d arguments (column-major order):
  // matrix3d(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44)
  return `matrix3d(${m11.toFixed(6)}, ${m12.toFixed(6)}, 0, ${m14.toFixed(8)}, ${m21.toFixed(6)}, ${m22.toFixed(6)}, 0, ${m24.toFixed(8)}, 0, 0, 1, 0, ${m41.toFixed(2)}, ${m42.toFixed(2)}, 0, ${m44})`;
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
