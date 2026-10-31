import { describe, it, expect } from "vitest";
import { getQuadMatrix3d, calculateQuadArea } from "../lib/homography";

describe("Homography Math", () => {
  it("should calculate correct area for a normalized rectangle", () => {
    // 0.2 x 0.2 square
    const quad = [
      { x: 0.1, y: 0.1 },
      { x: 0.3, y: 0.1 },
      { x: 0.3, y: 0.3 },
      { x: 0.1, y: 0.3 },
    ];
    const area = calculateQuadArea(quad);
    expect(area).toBeCloseTo(0.04, 3);
  });

  it("should return valid CSS matrix3d transform string", () => {
    const quad = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.58, y: 0.5 },
      { x: 0.22, y: 0.48 },
    ];
    const matrix = getQuadMatrix3d(quad, 800, 600);
    expect(matrix).toMatch(/^matrix3d\(/);
    expect(matrix).toContain(",");
    expect(matrix.endsWith(")")).toBe(true);
  });
});
