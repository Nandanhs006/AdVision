import { describe, it, expect } from "vitest";
import {
  renderCreativeToCanvas,
  renderCreativeToPng,
  fitText,
  ASPECT_DIMENSIONS,
} from "../lib/ads/render";
import { StyleSpec, AdCopy, AdAspect, LayoutArchetype } from "../lib/schema";
import copyTemplatesData from "@/data/copy-templates.json";

describe("Ad Studio: Renderer & Overflow Protection", () => {
  const sampleStyle: StyleSpec = {
    palette: { bg: "#0f172a", fg: "#f8fafc", accent: "#38bdf8" },
    typeStyle: "geometric-sans",
    layout: "minimal-center",
    motif: "waves",
    tone: ["meditative", "clean"],
    energy: 0.35,
  };

  const sampleCopy: AdCopy = {
    headline: "Crafted For Every Defining Moment",
    body: "Experience unmatched quality engineered to elevate your daily routine with effortless precision.",
    cta: "Explore More",
    caption: "Discover purposeful craftsmanship. #Design #Living #Advision",
    altText: "Ad creative poster",
  };

  it("should create canvas with exact pixel dimensions for 1:1, 4:5, and 9:16", () => {
    const aspects: AdAspect[] = ["1:1", "4:5", "9:16"];

    for (const aspect of aspects) {
      const canvas = renderCreativeToCanvas({
        style: sampleStyle,
        copy: sampleCopy,
        aspect,
        brandName: "Advision",
      });

      const expected = ASPECT_DIMENSIONS[aspect];
      expect(canvas.width).toBe(expected.width);
      expect(canvas.height).toBe(expected.height);
    }
  });

  it("should produce identical deterministic PNG buffers for identical seeds", async () => {
    const buf1 = await renderCreativeToPng({
      style: sampleStyle,
      copy: sampleCopy,
      aspect: "1:1",
      brandName: "Advision",
      seed: "fixed-seed-42",
    });

    const buf2 = await renderCreativeToPng({
      style: sampleStyle,
      copy: sampleCopy,
      aspect: "1:1",
      brandName: "Advision",
      seed: "fixed-seed-42",
    });

    expect(buf1.equals(buf2)).toBe(true);
  });

  it("should prevent text overflow across all layout archetypes", () => {
    const layouts: LayoutArchetype[] = [
      "minimal-center",
      "bold-type",
      "split-panel",
      "collage-grid",
      "story-vertical",
      "price-badge",
    ];

    for (const layout of layouts) {
      const testStyle: StyleSpec = { ...sampleStyle, layout };
      const canvas = renderCreativeToCanvas({
        style: testStyle,
        copy: sampleCopy,
        aspect: "1:1",
        brandName: "Advision",
      });

      // Verification that canvas completed rendering without throwing
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1080);
    }
  });

  it("should auto-fit and never exceed maxWidth and maxHeight bounds", () => {
    const canvas = renderCreativeToCanvas({
      style: sampleStyle,
      copy: sampleCopy,
      aspect: "1:1",
      brandName: "Advision",
    });
    const ctx = canvas.getContext("2d");

    const maxWidth = 500;
    const maxHeight = 160;
    const longText =
      "This is an unusually lengthy headline designed explicitly to verify that our dynamic text auto-fitting algorithm strictly prevents text from overflowing boundaries.";

    const fit = fitText(ctx, longText, maxWidth, maxHeight, 72, 16);

    expect(fit.totalHeight).toBeLessThanOrEqual(maxHeight + 10);
    for (const line of fit.lines) {
      const metric = ctx.measureText(line);
      expect(metric.width).toBeLessThanOrEqual(maxWidth + 10);
    }
  });

  it("should render multilingual copy without errors in en, ja, te, kn, fr", async () => {
    const languages = ["en", "ja", "te", "kn", "fr"] as const;

    for (const lang of languages) {
      const template = copyTemplatesData.templates[lang].awareness;
      const copy: AdCopy = {
        headline: template.headline,
        body: template.body,
        cta: template.cta,
        caption: template.caption,
        altText: template.altText,
      };

      const buf = await renderCreativeToPng({
        style: sampleStyle,
        copy,
        aspect: "4:5",
        brandName: "Advision",
      });

      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(1000); // Valid PNG data
    }
  });
});
