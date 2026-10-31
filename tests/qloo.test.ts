import { describe, it, expect, vi, beforeEach } from "vitest";
import { QlooClient } from "../lib/qloo/client";

describe("QlooClient", () => {
  let client: QlooClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new QlooClient({ mode: "fixture" });
  });

  it("should return search results in fixture mode with source: 'fixture'", async () => {
    const res = await client.search("Haruki Murakami");
    expect(res.source).toBe("fixture");
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].id).toContain("haruki_murakami");

    const traces = client.getTraces();
    expect(traces.length).toBe(1);
    expect(traces[0].endpoint).toBe("/search");
    expect(traces[0].status).toBe(200);
    expect(traces[0].cached).toBe(false);
  });

  it("should cache identical calls within TTL and record trace as cached", async () => {
    const first = await client.search("Blue Bottle Coffee");
    const second = await client.search("Blue Bottle Coffee");
    expect(first.results[0].id).toBe(second.results[0].id);

    const traces = client.getTraces();
    expect(traces.length).toBe(2);
    expect(traces[1].cached).toBe(true);
  });

  it("should return brand insights with affinities between 0 and 1", async () => {
    const res = await client.brandInsights({
      locationQuery: "Tokyo",
      entityIds: ["urn:entity:person:haruki_murakami"],
    });

    expect(res.source).toBe("fixture");
    expect(res.brands.length).toBeGreaterThan(0);
    res.brands.forEach((brand) => {
      expect(brand.affinity).toBeGreaterThanOrEqual(0);
      expect(brand.affinity).toBeLessThanOrEqual(1);
    });

    // Tokyo should rank Kissa Craft Roasters as top coffee match
    expect(res.brands[0].name).toBe("Kissa Craft Roasters");
    expect(res.brands[0].affinity).toBe(0.94);
  });

  it("should resolve tags properly", async () => {
    const res = await client.resolveTags("rainy neon");
    expect(res.tags.length).toBe(1);
    expect(res.tags[0].name).toBe("rainy neon");
  });

  it("should compare market profiles and return shared categories", async () => {
    const res = await client.compare(["entity_tokyo"], ["entity_sf"]);
    expect(res.affinityScore).toBeGreaterThan(0);
    expect(res.sharedCategories).toContain("coffee");
  });

  it("should retry on 429 status code in live mode", async () => {
    const liveClient = new QlooClient({
      apiKey: "test_key",
      baseUrl: "https://mock.qloo.api",
      mode: "live",
    });

    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(new Response("Too many requests", { status: 429 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            results: [{ id: "urn:entity:brand:test", name: "Test Brand", score: 0.9 }],
          }),
          { status: 200 }
        )
      );
    });

    const res = await liveClient.search("Test");
    expect(calls).toBe(2);
    expect(res.results[0].name).toBe("Test Brand");
  });

  it("should handle timeout gracefully and fall back to fixture", async () => {
    const liveClient = new QlooClient({
      apiKey: "test_key",
      baseUrl: "https://mock.qloo.api",
      mode: "live",
    });

    global.fetch = vi.fn().mockImplementation(() => {
      const err = new Error("AbortError");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const res = await liveClient.search("Timeout Test");
    expect(res.source).toBe("fixture");
    expect(res.results.length).toBeGreaterThan(0);
  });
});
