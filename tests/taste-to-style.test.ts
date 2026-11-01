import { describe, it, expect } from "vitest";
import { mapTasteToStyle } from "../lib/ads/taste-to-style";
import { TasteProfile } from "../lib/schema";

describe("Ad Studio: Taste to Style Mapping", () => {
  const ambientProfile: TasteProfile = {
    topTags: [
      { id: "tag-1", name: "sakamoto", weight: 0.95 },
      { id: "tag-2", name: "ambient", weight: 0.88 },
      { id: "tag-3", name: "meditative", weight: 0.72 },
    ],
    topEntities: [
      { type: "artist", name: "Ryuichi Sakamoto", affinity: 0.95 },
    ],
    traces: [],
    source: "fixture",
  };

  const streetProfile: TasteProfile = {
    topTags: [
      { id: "tag-1", name: "streetwear", weight: 0.94 },
      { id: "tag-2", name: "tyler", weight: 0.91 },
      { id: "tag-3", name: "hip-hop", weight: 0.85 },
    ],
    topEntities: [
      { type: "artist", name: "Tyler The Creator", affinity: 0.95 },
    ],
    traces: [],
    source: "fixture",
  };

  it("should map ambient tags to geometric/minimalist style spec", () => {
    const res = mapTasteToStyle(ambientProfile, "cohort-tokyo");

    expect(res.primary.style.typeStyle).toBe("geometric-sans");
    expect(res.primary.style.layout).toBe("minimal-center");
    expect(res.primary.style.motif).toBe("waves");
    expect(res.primary.reasons.length).toBeGreaterThan(0);
    // Reasons must mention the actual tags and weights
    expect(res.primary.reasons[0]).toContain("sakamoto");
  });

  it("should map streetwear & hiphop tags to bold condensed style spec", () => {
    const res = mapTasteToStyle(streetProfile, "cohort-nyc");

    expect(res.primary.style.typeStyle).toBe("condensed-bold");
    expect(["split-panel", "bold-type"]).toContain(res.primary.style.layout);
    expect(res.primary.reasons[0]).toMatch(/hip-hop|streetwear|tyler/);
  });

  it("should provide three distinct variants: primary, contrast, and safe", () => {
    const res = mapTasteToStyle(ambientProfile, "cohort-tokyo");

    expect(res.primary).toBeDefined();
    expect(res.contrast).toBeDefined();
    expect(res.safe).toBeDefined();

    // Contrast should differ from primary in layout
    expect(res.contrast.style.layout).not.toBe(res.primary.style.layout);
    // Safe should be minimal-center neutral
    expect(res.safe.style.layout).toBe("minimal-center");
  });

  it("should produce deterministic stable outputs for identical cohort IDs", () => {
    const resA = mapTasteToStyle(ambientProfile, "cohort-test-123");
    const resB = mapTasteToStyle(ambientProfile, "cohort-test-123");

    expect(resA.primary.style).toEqual(resB.primary.style);
    expect(resA.contrast.style).toEqual(resB.contrast.style);
    expect(resA.primary.reasons).toEqual(resB.primary.reasons);
  });

  it("should handle empty profiles cleanly with default fallback", () => {
    const emptyProfile: TasteProfile = {
      topTags: [],
      topEntities: [],
      traces: [],
      source: "fixture",
    };
    const res = mapTasteToStyle(emptyProfile, "cohort-empty");
    expect(res.primary.style.palette).toBeDefined();
    expect(res.safe.style.layout).toBe("minimal-center");
  });
});
