import { describe, it, expect } from "vitest";
import { validateAdCopy, getFallbackCopy, generateAdCopy } from "../lib/ads/copy";
import { Brief } from "../lib/schema";

describe("Ad Studio: Copy Generation & Compliance Validator", () => {
  const sampleBrief: Brief = {
    brandName: "RepBull Energy",
    product: "RepBull Zero",
    category: "beverage",
    goal: "awareness",
    languages: ["en"],
  };

  it("should validate a compliant copy successfully", () => {
    const validCopy = {
      headline: "Unleash Pure Energy Today",
      body: "Engineered for high performance and sustained focus without compromise.",
      cta: "Explore Now",
      caption: "Push your limits with clean sustained energy. Fuel your ambition. #Energy #Performance #Focus #Advision",
      altText: "RepBull Energy can with dynamic graphic accents",
    };

    const res = validateAdCopy(validCopy, { brief: sampleBrief, language: "en" });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.copy?.headline).toBe("Unleash Pure Energy Today");
  });

  it("should reject headlines with more than 7 words", () => {
    const badCopy = {
      headline: "This Is An Extremely Long Headline That Exceeds Seven Words For Sure",
      body: "Valid body text here.",
      cta: "Shop Now",
      caption: "Valid caption here. #TagOne #TagTwo #TagThree",
      altText: "Image description",
    };

    const res = validateAdCopy(badCopy, { brief: sampleBrief, language: "en" });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Headline exceeds 7 words"))).toBe(true);
  });

  it("should reject bodies longer than 125 characters", () => {
    const badCopy = {
      headline: "Short Headline",
      body: "This is an excessively long body copy that just keeps rambling on and on with too many filler words to fit inside the strict one hundred and twenty-five character limit for advertising creatives.",
      cta: "Shop Now",
      caption: "Valid caption text. #One #Two #Three",
      altText: "Image description",
    };

    const res = validateAdCopy(badCopy, { brief: sampleBrief, language: "en" });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Body exceeds 125 characters"))).toBe(true);
  });

  it("should reject banned claims like 'guaranteed' and '#1'", () => {
    const claimCopy1 = {
      headline: "Guaranteed Satisfaction Every Time",
      body: "Our formula is tested for quality.",
      cta: "Try Now",
      caption: "Experience peak taste. #Energy #Power #Focus",
      altText: "Graphic",
    };
    const res1 = validateAdCopy(claimCopy1, { brief: sampleBrief, language: "en" });
    expect(res1.valid).toBe(false);
    expect(res1.errors.some((e) => e.includes("unverifiable claim"))).toBe(true);

    const claimCopy2 = {
      headline: "The #1 Energy Drink",
      body: "Ranked top choice for athletes.",
      cta: "Buy Now",
      caption: "Power your day. #Athletics #Fuel #Greatness",
      altText: "Graphic",
    };
    const res2 = validateAdCopy(claimCopy2, { brief: sampleBrief, language: "en" });
    expect(res2.valid).toBe(false);
    expect(res2.errors.some((e) => e.includes("unverifiable claim"))).toBe(true);
  });

  it("should reject unsupplied price claims", () => {
    const priceCopy = {
      headline: "Get It For Only $19 Today",
      body: "Affordable energy drink.",
      cta: "Buy Now",
      caption: "Best value in town. #Energy #Savings #Drink",
      altText: "Graphic",
    };
    const res = validateAdCopy(priceCopy, { brief: sampleBrief, language: "en" });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("unsupplied pricing"))).toBe(true);
  });

  it("should validate all localized fallback copy templates (en, ja, te, kn, fr)", () => {
    const languages = ["en", "ja", "te", "kn", "fr"] as const;
    const goals = ["awareness", "traffic", "sales"] as const;

    for (const lang of languages) {
      for (const goal of goals) {
        const fallback = getFallbackCopy(lang, goal, "TestBrand");
        expect(fallback.headline).toBeTruthy();
        expect(fallback.body.length).toBeLessThanOrEqual(125);
        expect(fallback.cta).toBeTruthy();
        expect(fallback.caption.length).toBeLessThanOrEqual(300);

        // Fallback templates must pass our compliance check
        const val = validateAdCopy(fallback, { brief: sampleBrief, language: lang });
        expect(val.valid).toBe(true);
      }
    }
  });

  it("should fallback gracefully when no LLM key is provided", async () => {
    const res = await generateAdCopy({
      brief: sampleBrief,
      tone: ["energetic", "bold"],
      language: "en",
      goal: "awareness",
      apiKey: "", // empty key
    });

    expect(res.source).toBe("fallback");
    expect(res.copy.headline).toBeTruthy();
    expect(res.copy.cta).toBeTruthy();
  });
});
