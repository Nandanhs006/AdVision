import { z } from "zod";
import { QlooTraceEntry } from "../schema";

// Response Schemas for Qloo API
export const QlooSearchResultItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  score: z.number().optional(),
});
export type QlooSearchResultItem = z.infer<typeof QlooSearchResultItemSchema>;

export const QlooSearchResponseSchema = z.object({
  results: z.array(QlooSearchResultItemSchema).default([]),
  source: z.enum(["qloo", "fixture"]).default("qloo"),
});
export type QlooSearchResponse = z.infer<typeof QlooSearchResponseSchema>;

export const QlooInsightBrandItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  affinity: z.number().min(0).max(1), // query.affinity
  explainability: z
    .array(
      z.object({
        signal: z.string(),
        contribution: z.number(),
      })
    )
    .optional(),
  category: z.string().optional(),
});
export type QlooInsightBrandItem = z.infer<typeof QlooInsightBrandItemSchema>;

export const QlooInsightsResponseSchema = z.object({
  brands: z.array(QlooInsightBrandItemSchema).default([]),
  source: z.enum(["qloo", "fixture"]).default("qloo"),
});
export type QlooInsightsResponse = z.infer<typeof QlooInsightsResponseSchema>;

export const QlooTagItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
});
export type QlooTagItem = z.infer<typeof QlooTagItemSchema>;

export const QlooTagsResponseSchema = z.object({
  tags: z.array(QlooTagItemSchema).default([]),
  source: z.enum(["qloo", "fixture"]).default("qloo"),
});
export type QlooTagsResponse = z.infer<typeof QlooTagsResponseSchema>;

export const QlooCompareResponseSchema = z.object({
  affinityScore: z.number().min(0).max(1),
  sharedCategories: z.array(z.string()).default([]),
  sharedInterests: z.array(z.string()).default([]),
  source: z.enum(["qloo", "fixture"]).default("qloo"),
});
export type QlooCompareResponse = z.infer<typeof QlooCompareResponseSchema>;

// Cache entry interface
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-Memory LRU Cache with 10 min TTL
class SimpleLRUCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxEntries = 500;
  private ttlMs = 10 * 60 * 1000; // 10 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class QlooClient {
  private apiKey: string;
  private baseUrl: string;
  private mode: "live" | "fixture";
  private cache = new SimpleLRUCache();
  private traces: QlooTraceEntry[] = [];

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    mode?: "live" | "fixture";
  }) {
    this.apiKey = options?.apiKey || process.env.QLOO_API_KEY || "";
    this.baseUrl =
      options?.baseUrl ||
      process.env.QLOO_BASE_URL ||
      "https://hackathon.api.qloo.com";

    const envMode = (process.env.QLOO_MODE || "").toLowerCase();
    this.mode =
      options?.mode ||
      (this.apiKey && envMode !== "fixture" ? "live" : "fixture");
  }

  getMode(): "live" | "fixture" {
    return this.mode;
  }

  getTraces(): QlooTraceEntry[] {
    return [...this.traces];
  }

  clearTraces(): void {
    this.traces = [];
  }

  private recordTrace(
    endpoint: string,
    params: Record<string, unknown>,
    status: number,
    ms: number,
    cached: boolean
  ) {
    // Redact any potential keys or sensitive fields
    const safeParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k.toLowerCase().includes("key") || k.toLowerCase().includes("token")) {
        safeParams[k] = "[REDACTED]";
      } else {
        safeParams[k] = v;
      }
    }

    const entry: QlooTraceEntry = {
      endpoint,
      params: safeParams,
      status,
      ms: Math.round(ms),
      cached,
    };
    this.traces.push(entry);
    // Keep max 100 recent traces in memory
    if (this.traces.length > 100) {
      this.traces.shift();
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    timeoutMs = 10000
  ): Promise<Response> {
    const execute = async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(id);
        return res;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    let res = await execute();
    // One retry on 5xx or 429
    if (res.status === 429 || res.status >= 500) {
      // Exponential jitter backoff
      await new Promise((r) => setTimeout(r, 400));
      res = await execute();
    }
    return res;
  }

  /**
   * 1. Search: GET /search (or /v2/search)
   * Resolves query to entity IDs
   */
  async search(
    query: string,
    types?: string[],
    take = 5
  ): Promise<QlooSearchResponse> {
    const start = performance.now();
    const cacheKey = `search:${query}:${types?.join(",") || ""}:${take}`;
    const cached = this.cache.get<QlooSearchResponse>(cacheKey);

    if (cached) {
      this.recordTrace("/search", { query, types, take }, 200, performance.now() - start, true);
      return cached;
    }

    if (this.mode === "fixture") {
      const fixtureRes = this.getSearchFixture(query, types, take);
      this.cache.set(cacheKey, fixtureRes);
      this.recordTrace("/search", { query, types, take }, 200, performance.now() - start, false);
      return fixtureRes;
    }

    try {
      const params = new URLSearchParams({
        query,
        take: String(take),
      });
      if (types && types.length > 0) {
        params.append("types", types.join(","));
      }

      const url = `${this.baseUrl}/search?${params.toString()}`;
      const res = await this.fetchWithRetry(url, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/search", { query, types, take }, res.status, ms, false);
        // Fallback to fixture if live API error occurs
        return this.getSearchFixture(query, types, take);
      }

      const json = await res.json();
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json.results)
        ? json.results
        : Array.isArray(json.data)
        ? json.data
        : [];

      const parsed = QlooSearchResponseSchema.parse({
        results: items.map((it: Record<string, unknown>) => ({
          id: String(it.id || it.urn || `urn:entity:${query.toLowerCase().replace(/\s+/g, "_")}`),
          name: String(it.name || it.title || query),
          type: it.type ? String(it.type) : undefined,
          score: typeof it.score === "number" ? it.score : 1.0,
        })),
        source: "qloo",
      });

      this.cache.set(cacheKey, parsed);
      this.recordTrace("/search", { query, types, take }, 200, ms, false);
      return parsed;
    } catch {
      const ms = performance.now() - start;
      this.recordTrace("/search", { query, types, take }, 500, ms, false);
      return this.getSearchFixture(query, types, take);
    }
  }

  /**
   * 2. Brand Insights: GET /v2/insights
   * Retrieves affinity scores for brands based on interest entities, tags, and location
   */
  async brandInsights(args: {
    entityIds?: string[];
    tagIds?: string[];
    locationQuery?: string;
    excludeEntityIds?: string[];
    take?: number;
  }): Promise<QlooInsightsResponse> {
    const start = performance.now();
    const take = args.take || 50;
    const cacheKey = `insights:${args.entityIds?.sort().join(",")}:${args.tagIds?.sort().join(",")}:${args.locationQuery || ""}:${take}`;
    const cached = this.cache.get<QlooInsightsResponse>(cacheKey);

    if (cached) {
      this.recordTrace("/v2/insights", { ...args, take }, 200, performance.now() - start, true);
      return cached;
    }

    if (this.mode === "fixture") {
      const fixtureRes = this.getInsightsFixture(args);
      this.cache.set(cacheKey, fixtureRes);
      this.recordTrace("/v2/insights", { ...args, take }, 200, performance.now() - start, false);
      return fixtureRes;
    }

    try {
      const params = new URLSearchParams({
        "filter.type": "urn:entity:brand",
        "feature.explainability": "true",
        take: String(take),
      });

      if (args.entityIds && args.entityIds.length > 0) {
        args.entityIds.forEach((id) => params.append("signal.interests.entities", id));
      }
      if (args.tagIds && args.tagIds.length > 0) {
        args.tagIds.forEach((t) => params.append("signal.interests.tags", t));
      }
      if (args.locationQuery) {
        params.append("filter.location.query", args.locationQuery);
      }
      if (args.excludeEntityIds && args.excludeEntityIds.length > 0) {
        args.excludeEntityIds.forEach((e) => params.append("filter.exclude.entities", e));
      }

      const url = `${this.baseUrl}/v2/insights?${params.toString()}`;
      const res = await this.fetchWithRetry(url, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/v2/insights", { ...args, take }, res.status, ms, false);
        return this.getInsightsFixture(args);
      }

      const json = await res.json();
      const rawBrands = Array.isArray(json)
        ? json
        : Array.isArray(json.brands)
        ? json.brands
        : Array.isArray(json.results)
        ? json.results
        : Array.isArray(json.data)
        ? json.data
        : [];

      const brands = rawBrands.map((b: Record<string, unknown>) => {
        const queryObj = (b.query || {}) as Record<string, unknown>;
        const affinityVal =
          typeof queryObj.affinity === "number"
            ? queryObj.affinity
            : typeof b.affinity === "number"
            ? b.affinity
            : typeof b.score === "number"
            ? b.score
            : 0.5;

        // Parse explainability contributions
        const explainArray = Array.isArray(b.explainability)
          ? b.explainability.map((ex: Record<string, unknown>) => ({
              signal: String(ex.signal || ex.name || "Taste Match"),
              contribution: typeof ex.contribution === "number" ? ex.contribution : 0.2,
            }))
          : undefined;

        return {
          id: String(b.id || b.urn || "urn:entity:brand:unknown"),
          name: String(b.name || b.title || "Brand"),
          affinity: Math.max(0, Math.min(1, affinityVal)),
          explainability: explainArray,
          category: b.category ? String(b.category) : undefined,
        };
      });

      const parsed = QlooInsightsResponseSchema.parse({
        brands,
        source: "qloo",
      });

      this.cache.set(cacheKey, parsed);
      this.recordTrace("/v2/insights", { ...args, take }, 200, ms, false);
      return parsed;
    } catch {
      const ms = performance.now() - start;
      this.recordTrace("/v2/insights", { ...args, take }, 500, ms, false);
      return this.getInsightsFixture(args);
    }
  }

  /**
   * 3. Resolve Tags: GET /v2/tags
   */
  async resolveTags(term: string): Promise<QlooTagsResponse> {
    const start = performance.now();
    const cacheKey = `tags:${term.toLowerCase()}`;
    const cached = this.cache.get<QlooTagsResponse>(cacheKey);

    if (cached) {
      this.recordTrace("/v2/tags", { term }, 200, performance.now() - start, true);
      return cached;
    }

    if (this.mode === "fixture") {
      const fixtureRes = this.getTagsFixture(term);
      this.cache.set(cacheKey, fixtureRes);
      this.recordTrace("/v2/tags", { term }, 200, performance.now() - start, false);
      return fixtureRes;
    }

    try {
      const url = `${this.baseUrl}/v2/tags?filter.query=${encodeURIComponent(term)}`;
      const res = await this.fetchWithRetry(url, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/v2/tags", { term }, res.status, ms, false);
        return this.getTagsFixture(term);
      }

      const json = await res.json();
      const rawTags = Array.isArray(json)
        ? json
        : Array.isArray(json.tags)
        ? json.tags
        : Array.isArray(json.results)
        ? json.results
        : [];

      const parsed = QlooTagsResponseSchema.parse({
        tags: rawTags.map((t: Record<string, unknown>) => ({
          id: String(t.id || `urn:tag:${term.toLowerCase().replace(/\s+/g, "_")}`),
          name: String(t.name || term),
          category: t.category ? String(t.category) : undefined,
        })),
        source: "qloo",
      });

      this.cache.set(cacheKey, parsed);
      this.recordTrace("/v2/tags", { term }, 200, ms, false);
      return parsed;
    } catch {
      const ms = performance.now() - start;
      this.recordTrace("/v2/tags", { term }, 500, ms, false);
      return this.getTagsFixture(term);
    }
  }

  /**
   * 4. Audiences: GET /v2/audiences
   */
  async audiences(type?: string): Promise<{ audiences: Array<{ id: string; name: string }>; source: "qloo" | "fixture" }> {
    const start = performance.now();
    const cacheKey = `audiences:${type || ""}`;
    const cached = this.cache.get<{ audiences: Array<{ id: string; name: string }>; source: "qloo" | "fixture" }>(cacheKey);
    if (cached) return cached;

    if (this.mode === "fixture") {
      const res = {
        audiences: [
          { id: "aud_young_urban", name: "Young Urban Trendsetters" },
          { id: "aud_arts_culture", name: "Arts & Indie Enthusiasts" },
          { id: "aud_tech_early_adopters", name: "Tech Pioneers" },
        ],
        source: "fixture" as const,
      };
      this.cache.set(cacheKey, res);
      this.recordTrace("/v2/audiences", { type }, 200, performance.now() - start, false);
      return res;
    }

    try {
      const url = `${this.baseUrl}/v2/audiences${type ? `?type=${encodeURIComponent(type)}` : ""}`;
      const res = await this.fetchWithRetry(url, {
        headers: { "X-Api-Key": this.apiKey, Accept: "application/json" },
      });
      const ms = performance.now() - start;
      if (!res.ok) throw new Error("Audiences error");
      const json = await res.json();
      const list = (json.audiences || json.data || []).map((a: Record<string, unknown>) => ({
        id: String(a.id || a.urn),
        name: String(a.name),
      }));
      const result = { audiences: list, source: "qloo" as const };
      this.cache.set(cacheKey, result);
      this.recordTrace("/v2/audiences", { type }, 200, ms, false);
      return result;
    } catch {
      return {
        audiences: [{ id: "aud_urban", name: "Urban Creative" }],
        source: "fixture",
      };
    }
  }

  /**
   * 5. Compare: GET /v2/insights/compare
   * Used in Studio's "What do these two markets share" panel
   */
  async compare(aIds: string[], bIds: string[]): Promise<QlooCompareResponse> {
    const start = performance.now();
    const cacheKey = `compare:${aIds.sort().join(",")}:${bIds.sort().join(",")}`;
    const cached = this.cache.get<QlooCompareResponse>(cacheKey);
    if (cached) {
      this.recordTrace("/v2/insights/compare", { aIds, bIds }, 200, performance.now() - start, true);
      return cached;
    }

    if (this.mode === "fixture") {
      const fixtureRes = this.getCompareFixture(aIds, bIds);
      this.cache.set(cacheKey, fixtureRes);
      this.recordTrace("/v2/insights/compare", { aIds, bIds }, 200, performance.now() - start, false);
      return fixtureRes;
    }

    try {
      const params = new URLSearchParams();
      aIds.forEach((id) => params.append("a.entities", id));
      bIds.forEach((id) => params.append("b.entities", id));

      const url = `${this.baseUrl}/v2/insights/compare?${params.toString()}`;
      const res = await this.fetchWithRetry(url, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/v2/insights/compare", { aIds, bIds }, res.status, ms, false);
        return this.getCompareFixture(aIds, bIds);
      }

      const json = await res.json();
      const parsed = QlooCompareResponseSchema.parse({
        affinityScore: typeof json.affinity === "number" ? json.affinity : 0.74,
        sharedCategories: json.categories || ["coffee", "music", "books"],
        sharedInterests: json.interests || ["Specialty Coffee", "Indie Cinema", "Minimalist Design"],
        source: "qloo",
      });

      this.cache.set(cacheKey, parsed);
      this.recordTrace("/v2/insights/compare", { aIds, bIds }, 200, ms, false);
      return parsed;
    } catch {
      const ms = performance.now() - start;
      this.recordTrace("/v2/insights/compare", { aIds, bIds }, 500, ms, false);
      return this.getCompareFixture(aIds, bIds);
    }
  }

  // --- Fixture Data Generators ---

  private getSearchFixture(query: string, types?: string[], take = 5): QlooSearchResponse {
    const qLower = query.toLowerCase();
    const mockEntities: Record<string, { id: string; name: string; type: string }> = {
      // US - RepBull / Extreme Sports / Gaming / Racing
      "repbull": { id: "urn:entity:brand:repbull_energy", name: "RepBull Energy", type: "urn:entity:brand" },
      "repbull energy": { id: "urn:entity:brand:repbull_energy", name: "RepBull Energy", type: "urn:entity:brand" },
      "red bull": { id: "urn:entity:brand:repbull_energy", name: "RepBull Energy", type: "urn:entity:brand" },
      "formula 1": { id: "urn:entity:generic:formula_1", name: "Formula 1", type: "urn:entity:genre" },
      "extreme sports": { id: "urn:entity:generic:extreme_sports", name: "Extreme Sports", type: "urn:entity:genre" },
      "gaming": { id: "urn:entity:generic:gaming", name: "Gaming", type: "urn:entity:genre" },
      "skateboarding": { id: "urn:entity:generic:skateboarding", name: "Skateboarding", type: "urn:entity:genre" },
      "action cinema": { id: "urn:entity:genre:action_cinema", name: "Action Cinema", type: "urn:entity:genre" },

      // Japan - Sony Alpha Camera / Photography
      "sony alpha optics": { id: "urn:entity:brand:sony_alpha", name: "Sony Alpha Optics", type: "urn:entity:brand" },
      "sony alpha": { id: "urn:entity:brand:sony_alpha", name: "Sony Alpha Optics", type: "urn:entity:brand" },
      "sony camera": { id: "urn:entity:brand:sony_alpha", name: "Sony Alpha Optics", type: "urn:entity:brand" },
      "mirrorless cameras": { id: "urn:entity:generic:mirrorless_cameras", name: "Mirrorless Cameras", type: "urn:entity:brand" },
      "tokyo street photography": { id: "urn:entity:tag:street_photography", name: "Tokyo Street Photography", type: "urn:entity:tag" },
      "cinematography": { id: "urn:entity:tag:cinematography", name: "Cinematography", type: "urn:entity:tag" },
      "haruki murakami": { id: "urn:entity:person:haruki_murakami", name: "Haruki Murakami", type: "urn:entity:person" },
      "blue bottle coffee": { id: "urn:entity:brand:kissa_coffee", name: "Blue Bottle Coffee", type: "urn:entity:brand" },
      "sony audio": { id: "urn:entity:brand:lumina_audio", name: "Sony Audio", type: "urn:entity:brand" },
      "uniqlo": { id: "urn:entity:brand:solstice_atelier", name: "Uniqlo", type: "urn:entity:brand" },
      "studio ghibli": { id: "urn:entity:media:studio_ghibli", name: "Studio Ghibli", type: "urn:entity:media" },

      // India - MRF Tyres / Cricket / Highway Touring
      "mrf zlx tyres": { id: "urn:entity:brand:mrf_tyres", name: "MRF ZLX Tyres", type: "urn:entity:brand" },
      "mrf tyres": { id: "urn:entity:brand:mrf_tyres", name: "MRF ZLX Tyres", type: "urn:entity:brand" },
      "cricket": { id: "urn:entity:sport:cricket", name: "Cricket", type: "urn:entity:genre" },
      "formula racing": { id: "urn:entity:sport:formula_racing", name: "Formula Racing", type: "urn:entity:genre" },
      "highway road trips": { id: "urn:entity:tag:road_trips", name: "Highway Road Trips", type: "urn:entity:tag" },
      "motorcycling": { id: "urn:entity:brand:motorcycling", name: "Motorcycling", type: "urn:entity:brand" },
      "automotive design": { id: "urn:entity:tag:automotive_design", name: "Automotive Design", type: "urn:entity:tag" },
      "ss rajamouli": { id: "urn:entity:person:ss_rajamouli", name: "S.S. Rajamouli", type: "urn:entity:person" },
      "filter coffee": { id: "urn:entity:brand:malabar_tea", name: "Filter Coffee Traditions", type: "urn:entity:brand" },
      "royal enfield": { id: "urn:entity:brand:royal_enfield", name: "Royal Enfield", type: "urn:entity:brand" },
      "telugu cinema": { id: "urn:entity:genre:telugu_cinema", name: "Telugu Cinema", type: "urn:entity:genre" },
      "chai point": { id: "urn:entity:brand:malabar_tea", name: "Chai Point", type: "urn:entity:brand" },

      // General
      "patagonia": { id: "urn:entity:brand:solstice_atelier", name: "Patagonia", type: "urn:entity:brand" },
      "aeropress": { id: "urn:entity:brand:kissa_coffee", name: "AeroPress Coffee", type: "urn:entity:brand" },
      "science fiction": { id: "urn:entity:genre:sci_fi", name: "Science Fiction", type: "urn:entity:genre" },
      "specialty coffee": { id: "urn:entity:tag:specialty_coffee", name: "Specialty Coffee", type: "urn:entity:tag" },
      "third wave coffee": { id: "urn:entity:brand:kissa_coffee", name: "Third Wave Coffee", type: "urn:entity:brand" },
      "indie rock": { id: "urn:entity:genre:indie_rock", name: "Indie Rock", type: "urn:entity:genre" },
      "french cinema": { id: "urn:entity:genre:french_cinema", name: "French Cinema", type: "urn:entity:genre" },
      "espresso": { id: "urn:entity:brand:kissa_coffee", name: "Artisanal Espresso", type: "urn:entity:brand" },
    };

    const match = mockEntities[qLower];
    const results = match
      ? [match]
      : [
          {
            id: `urn:entity:generic:${qLower.replace(/\s+/g, "_")}`,
            name: query,
            type: types?.[0] || "urn:entity:brand",
            score: 0.85,
          },
        ];

    return {
      results: results.slice(0, take),
      source: "fixture",
    };
  }

  private getInsightsFixture(args: {
    entityIds?: string[];
    tagIds?: string[];
    locationQuery?: string;
  }): QlooInsightsResponse {
    const loc = (args.locationQuery || "").toLowerCase();

    // 1. United States -> RepBull Energy (0.96)
    if (loc.includes("united states") || loc.includes("us") || loc.includes("america") || loc.includes("san francisco") || loc.includes("seattle") || loc.includes("new york")) {
      return {
        brands: [
          {
            id: "urn:entity:brand:repbull_energy",
            name: "RepBull Energy",
            affinity: 0.96,
            category: "beverage",
            explainability: [
              { signal: "Formula 1 & extreme sports affinity", contribution: 0.54 },
              { signal: "Action gaming & high-octane lifestyle index", contribution: 0.42 },
            ],
          },
          {
            id: "urn:entity:brand:lumina_audio",
            name: "Lumina Spatial Sound",
            affinity: 0.88,
            category: "audio",
            explainability: [{ signal: "Podcasts & sound realism correlation", contribution: 0.45 }],
          },
          {
            id: "urn:entity:brand:folio_press",
            name: "Folio & Horizon Press",
            affinity: 0.82,
            category: "books",
            explainability: [{ signal: "Speculative fiction reader index", contribution: 0.40 }],
          },
          {
            id: "urn:entity:brand:solstice_atelier",
            name: "Atelier Solstice",
            affinity: 0.78,
            category: "fashion",
            explainability: [{ signal: "Outdoor performance apparel", contribution: 0.40 }],
          },
          {
            id: "urn:entity:brand:kissa_coffee",
            name: "Kissa Craft Roasters",
            affinity: 0.75,
            category: "coffee",
            explainability: [{ signal: "Specialty cold brew affinity", contribution: 0.38 }],
          },
        ],
        source: "fixture",
      };
    }

    // 2. Japan -> Sony Alpha Optics (0.96) or Kissa Coffee for Murakami profile
    if (loc.includes("japan") || loc.includes("tokyo")) {
      const isMurakami = args.entityIds?.some((e) => e.includes("murakami"));
      const topBrand = isMurakami
        ? {
            id: "urn:entity:brand:kissa_coffee",
            name: "Kissa Craft Roasters",
            affinity: 0.94,
            category: "coffee",
            explainability: [
              { signal: "Shibuya specialty coffee affinity", contribution: 0.52 },
              { signal: "Haruki Murakami café culture correlation", contribution: 0.42 },
            ],
          }
        : {
            id: "urn:entity:brand:sony_alpha",
            name: "Sony Alpha Optics",
            affinity: 0.96,
            category: "electronics",
            explainability: [
              { signal: "Full-frame camera & optics enthusiast index", contribution: 0.55 },
              { signal: "Tokyo street photography correlation", contribution: 0.41 },
            ],
          };

      const secondBrand = isMurakami
        ? {
            id: "urn:entity:brand:sony_alpha",
            name: "Sony Alpha Optics",
            affinity: 0.91,
            category: "electronics",
            explainability: [
              { signal: "Tokyo street photography correlation", contribution: 0.41 },
            ],
          }
        : {
            id: "urn:entity:brand:kissa_coffee",
            name: "Kissa Craft Roasters",
            affinity: 0.89,
            category: "coffee",
            explainability: [
              { signal: "Shibuya specialty coffee culture", contribution: 0.50 },
            ],
          };

      return {
        brands: [
          topBrand,
          secondBrand,
          {
            id: "urn:entity:brand:lumina_audio",
            name: "Lumina Spatial Sound",
            affinity: 0.85,
            category: "audio",
            explainability: [
              { signal: "Audiophile headphone overlap", contribution: 0.44 },
            ],
          },
          {
            id: "urn:entity:brand:folio_press",
            name: "Folio & Horizon Press",
            affinity: 0.81,
            category: "books",
            explainability: [
              { signal: "Literary fiction reader index", contribution: 0.40 },
            ],
          },
          {
            id: "urn:entity:brand:solstice_atelier",
            name: "Atelier Solstice",
            affinity: 0.77,
            category: "fashion",
            explainability: [
              { signal: "Tokyo minimalist wardrobe index", contribution: 0.40 },
            ],
          },
        ],
        source: "fixture",
      };
    }

    // 3. India -> MRF ZLX Tyres (0.95)
    if (loc.includes("india") || loc.includes("visakhapatnam") || loc.includes("bengaluru") || loc.includes("vizag") || loc.includes("mumbai")) {
      return {
        brands: [
          {
            id: "urn:entity:brand:mrf_tyres",
            name: "MRF ZLX Tyres",
            affinity: 0.95,
            category: "automotive",
            explainability: [
              { signal: "Indian highway endurance & motorsport rally index", contribution: 0.52 },
              { signal: "Cricket & automotive performance correlation", contribution: 0.43 },
            ],
          },
          {
            id: "urn:entity:brand:malabar_tea",
            name: "Malabar Hill Spiced Tea",
            affinity: 0.88,
            category: "tea",
            explainability: [
              { signal: "Chai and south Indian filter coffee index", contribution: 0.50 },
            ],
          },
          {
            id: "urn:entity:brand:lumina_audio",
            name: "Lumina Spatial Sound",
            affinity: 0.78,
            category: "audio",
            explainability: [
              { signal: "Indian cinema sound design fan index", contribution: 0.42 },
            ],
          },
          {
            id: "urn:entity:brand:solstice_atelier",
            name: "Atelier Solstice",
            affinity: 0.65,
            category: "fashion",
            explainability: [
              { signal: "Contemporary urban wear index", contribution: 0.35 },
            ],
          },
        ],
        source: "fixture",
      };
    }

    // Default global / western cities (San Francisco, Paris, London)
    return {
      brands: [
        {
          id: "urn:entity:brand:kissa_coffee",
          name: "Kissa Craft Roasters",
          affinity: 0.87,
          category: "coffee",
          explainability: [
            { signal: "Specialty coffee enthusiast index", contribution: 0.54 },
            { signal: "Independent cafe visitor frequency", contribution: 0.33 },
          ],
        },
        {
          id: "urn:entity:brand:folio_press",
          name: "Folio & Horizon Press",
          affinity: 0.84,
          category: "books",
          explainability: [
            { signal: "Speculative fiction & sci-fi interest", contribution: 0.58 },
            { signal: "Indie publisher patron graph", contribution: 0.26 },
          ],
        },
        {
          id: "urn:entity:brand:solstice_atelier",
          name: "Atelier Solstice",
          affinity: 0.79,
          category: "fashion",
          explainability: [
            { signal: "Sustainable outdoor apparel affinity", contribution: 0.51 },
          ],
        },
        {
          id: "urn:entity:brand:lumina_audio",
          name: "Lumina Spatial Sound",
          affinity: 0.76,
          category: "audio",
          explainability: [
            { signal: "Podcast & studio audio gear preference", contribution: 0.44 },
          ],
        },
        {
          id: "urn:entity:brand:fjordline_rail",
          name: "Fjordline Expedition Rail",
          affinity: 0.71,
          category: "travel",
          explainability: [
            { signal: "Scenic eco-rail journey interest", contribution: 0.46 },
          ],
        },
        {
          id: "urn:entity:brand:cask_peat_spirits",
          name: "Cask & Peat Distillers",
          affinity: 0.65,
          category: "spirits",
          explainability: [
            { signal: "Craft distillery interest profile", contribution: 0.39 },
          ],
        },
        {
          id: "urn:entity:brand:malabar_tea",
          name: "Malabar Hill Spiced Tea",
          affinity: 0.58,
          category: "tea",
          explainability: [
            { signal: "Artisan beverage exploration", contribution: 0.32 },
          ],
        },
      ],
      source: "fixture",
    };
  }

  private getTagsFixture(term: string): QlooTagsResponse {
    const t = term.toLowerCase();
    return {
      tags: [
        {
          id: `urn:tag:mood:${t.replace(/\s+/g, "_")}`,
          name: term,
          category: "mood",
        },
      ],
      source: "fixture",
    };
  }

  private getCompareFixture(aIds: string[], bIds: string[]): QlooCompareResponse {
    return {
      affinityScore: 0.78,
      sharedCategories: ["coffee", "books", "audio"],
      sharedInterests: ["Third Wave Coffee", "Acoustic Audio", "Print Design"],
      source: "fixture",
    };
  }
}

// Singleton helper for server-side usage
let globalClient: QlooClient | null = null;
export function getQlooClient(): QlooClient {
  if (!globalClient) {
    globalClient = new QlooClient();
  }
  return globalClient;
}
