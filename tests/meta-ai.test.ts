import { describe, it, expect } from "vitest";
import { getMetaAIClient, MetaAIClient } from "@/lib/ai/meta-client";
import { runSlotScout } from "@/lib/slotScout";

describe("Meta AI Model Integration (Muse Spark & SAM 3.1)", () => {
  it("should initialize MetaAIClient with default hackathon parameters", () => {
    const client = getMetaAIClient();
    expect(client).toBeDefined();
    expect(["meta", "baseten", "simulated"]).toContain(client.getMode());
  });

  it("should generate simulated ad copy using Muse Spark fallback schema", async () => {
    const client = new MetaAIClient({ mode: "simulated" });
    const response = await client.chat([
      { role: "user", content: "Generate json ad copy for RepBull" },
    ]);
    expect(response).toContain("Charge Beyond Limits");
    const parsed = JSON.parse(response);
    expect(parsed.headline).toBeDefined();
    expect(parsed.cta).toBeDefined();
  });

  it("should accurately convert arbitrary SAM 3.1 polygons to 4-corner bounding quads", () => {
    const client = getMetaAIClient();
    // Complex 8-point polygon representing a detected billboard surface
    const polygon = [
      { x: 0.21, y: 0.16 },
      { x: 0.28, y: 0.17 },
      { x: 0.35, y: 0.19 },
      { x: 0.35, y: 0.25 },
      { x: 0.35, y: 0.31 },
      { x: 0.28, y: 0.31 },
      { x: 0.21, y: 0.31 },
      { x: 0.21, y: 0.23 },
    ];

    const quad = client.approxBoundingQuad(polygon);
    expect(quad.length).toBe(4);
    // [TL, TR, BR, BL]
    expect(quad[0].x).toBeLessThan(quad[1].x); // TL.x < TR.x
    expect(quad[0].y).toBeLessThan(quad[3].y); // TL.y < BL.y
    expect(quad[1].y).toBeLessThan(quad[2].y); // TR.y < BR.y
    expect(quad[3].x).toBeLessThan(quad[2].x); // BL.x < BR.x
  });

  it("should discover in-scene slots with SAM 3.1 confidence and Muse Wonder scene analysis", async () => {
    const scout = await runSlotScout({
      filmTitle: "Tokyo Shibuya Crossing",
      currentSec: 5.0,
      durationSec: 20.0,
    });

    expect(scout.filmTitle).toBe("Tokyo Shibuya Crossing");
    expect(scout.slots.length).toBeGreaterThan(0);
    expect(scout.slots[0].modelOrigin).toContain("Meta SAM 3.1");
    expect(scout.sceneAtmosphere).toContain("shibuya");
    expect(scout.aiModel).toContain("Meta SAM 3.1");
  });

  it("should generate a 15-second 3-act kinetic motion ad plan using Muse Spark", async () => {
    const { generateMotionAdPlan } = await import("@/lib/ads/motion");
    const plan = await generateMotionAdPlan({
      campaignId: "camp-repbull-focus",
      brief: {
        brandName: "RepBull Energy",
        product: "Zero Sugar Ultra Focus",
        category: "beverage",
        goal: "awareness",
        languages: ["en"],
      },
      cohort: {
        city: "Tokyo",
        country: "Japan",
        language: "en",
        ageBand: "25-34",
        anchors: ["Formula 1", "Haruki Murakami", "Shibuya Nightlife"],
        goal: "awareness",
      },
      styleSpec: {
        palette: { bg: "#0b0f19", fg: "#f1f5f9", accent: "#06b6d4" },
        typeStyle: "geometric-sans",
        layout: "bold-type",
        motif: "waves",
        tone: ["bold", "kinetic", "high-energy"],
        energy: 0.9,
      },
    });

    expect(plan.totalDurationSec).toBe(15.0);
    expect(plan.beats.length).toBe(3);
    expect(plan.beats[0].act).toBe(1);
    expect(plan.beats[0].name).toBe("Hook");
    expect(plan.beats[1].act).toBe(2);
    expect(plan.beats[1].name).toBe("Core Benefit");
    expect(plan.beats[2].act).toBe(3);
    expect(plan.beats[2].name).toBe("CTA & QR");
    expect(plan.aiModel).toContain("Meta Muse Spark");
  });
});
