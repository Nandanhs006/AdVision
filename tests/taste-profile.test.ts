import { describe, it, expect } from "vitest";
import { buildTasteProfile } from "../lib/ads/taste-profile";
import { Cohort } from "../lib/schema";
import { QlooClient } from "../lib/qloo/client";

describe("Ad Studio: Taste Profile Assembly", () => {
  const sampleTokyoCohort: Cohort = {
    city: "Tokyo",
    country: "Japan",
    language: "ja",
    ageBand: "25-34",
    anchors: ["Haruki Murakami", "Ryuichi Sakamoto", "Daikanyama T-Site", "Blue Bottle Coffee"],
    goal: "awareness",
  };

  const sampleNycCohort: Cohort = {
    city: "New York",
    country: "United States",
    language: "en",
    ageBand: "21-30",
    anchors: ["Tyler The Creator", "Dumbo Brooklyn", "High Line Park"],
    goal: "traffic",
  };

  it("should assemble a rich taste profile in fixture mode", async () => {
    const client = new QlooClient({ mode: "fixture" });
    const profile = await buildTasteProfile(sampleTokyoCohort, { client });

    expect(profile.source).toBe("fixture");
    expect(profile.topTags.length).toBeGreaterThan(0);
    expect(profile.topTags.length).toBeLessThanOrEqual(8);
    expect(profile.topEntities.length).toBeGreaterThan(0);
    expect(profile.traces.length).toBeGreaterThan(0);

    // Weights should be between 0 and 1
    profile.topTags.forEach((tag) => {
      expect(tag.weight).toBeGreaterThanOrEqual(0);
      expect(tag.weight).toBeLessThanOrEqual(1);
    });

    // Top entities should include artists, movies, places, or brands
    const types = new Set(profile.topEntities.map((e) => e.type));
    expect(types.size).toBeGreaterThan(1);
  });

  it("should produce distinctly different taste profiles for Tokyo vs NYC", async () => {
    const client = new QlooClient({ mode: "fixture" });
    const tokyoProfile = await buildTasteProfile(sampleTokyoCohort, { client });
    const nycProfile = await buildTasteProfile(sampleNycCohort, { client });

    const tokyoEntityNames = tokyoProfile.topEntities.map((e) => e.name);
    const nycEntityNames = nycProfile.topEntities.map((e) => e.name);

    // Ensure taste profiles reflect their distinct cultural anchors
    expect(tokyoEntityNames).not.toEqual(nycEntityNames);
  });

  it("should filter out generic uninformative stop words from topTags", async () => {
    const client = new QlooClient({ mode: "fixture" });
    const profile = await buildTasteProfile(sampleTokyoCohort, { client });

    const tagNames = profile.topTags.map((t) => t.name.toLowerCase());
    expect(tagNames).not.toContain("thing");
    expect(tagNames).not.toContain("entity");
    expect(tagNames).not.toContain("general");
    expect(tagNames).not.toContain("item");
    expect(tagNames).not.toContain("correlation");
  });
});
