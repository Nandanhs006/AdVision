import { describe, it, expect, beforeEach } from "vitest";
import { IntentEngineClient } from "../lib/intent/client";

describe("IntentEngineClient & Ad Network Routing", () => {
  let client: IntentEngineClient;

  beforeEach(() => {
    client = new IntentEngineClient({ mode: "fixture" });
  });

  it("should return search results in fixture mode with source: 'fixture'", async () => {
    const res = await client.search("RepBull Energy");
    expect(res.source).toBe("fixture");
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].name).toBe("RepBull Energy");
    expect(res.results[0].id).toBe("urn:entity:brand:repbull_energy");

    const traces = client.getTraces();
    expect(traces.length).toBe(1);
    expect(traces[0].endpoint).toBe("/search");
    expect(traces[0].status).toBe(200);
    expect(traces[0].cached).toBe(false);
  });

  it("should cache identical calls within TTL and record trace as cached", async () => {
    await client.search("Sony Alpha Optics");
    const res2 = await client.search("Sony Alpha Optics");
    expect(res2.results[0].name).toBe("Sony Alpha Optics");

    const traces = client.getTraces();
    expect(traces.length).toBe(2);
    expect(traces[1].cached).toBe(true);
  });

  it("should route brands to Google AdSense or Meta Ads based on commercial category", async () => {
    const res = await client.brandInsights({
      locationQuery: "Tokyo",
      entityIds: ["urn:entity:brand:sony_alpha"],
    });

    expect(res.brands.length).toBeGreaterThan(0);
    const topBrand = res.brands[0];
    expect(topBrand.affinity).toBeGreaterThanOrEqual(0);
    expect(topBrand.affinity).toBeLessThanOrEqual(1);

    // Electronics & Tech route to Google AdSense
    const sony = res.brands.find((b) => b.id.includes("sony"));
    if (sony) {
      expect(sony.adNetwork).toBe("google_adsense");
    }

    // Beverage routes to Meta Ads
    const beverage = res.brands.find((b) => b.category === "coffee" || b.category === "beverage");
    if (beverage) {
      expect(beverage.adNetwork).toBe("meta_ads");
    }
  });

  it("should resolve commercial intent tags properly", async () => {
    const res = await client.resolveTags("neon");
    expect(res.tags.length).toBeGreaterThan(0);
    expect(res.tags[0].name).toBe("Neon Aesthetic");
    expect(res.tags[0].category).toBe("visual");
  });

  it("should compare market profiles and return shared categories and intent overlap", async () => {
    const res = await client.compare(["urn:entity:brand:sony_alpha"], ["urn:entity:brand:repbull_energy"]);
    expect(res.affinityScore).toBeGreaterThan(0);
    expect(res.sharedCategories.length).toBeGreaterThan(0);
  });
});
