import { z } from "zod";
import { DecisionTraceEntry } from "../schema";

// Response Schemas for Intent Classification & Ad Network Engine
export const IntentSearchResultItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  score: z.number().optional(),
});
export type IntentSearchResultItem = z.infer<typeof IntentSearchResultItemSchema>;

export const IntentSearchResponseSchema = z.object({
  results: z.array(IntentSearchResultItemSchema).default([]),
  source: z.enum(["intent_engine", "google_adsense", "meta_ads", "fixture"]).default("intent_engine"),
});
export type IntentSearchResponse = z.infer<typeof IntentSearchResponseSchema>;

export const IntentBrandItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  affinity: z.number().min(0).max(1), // intent affinity score
  intentScore: z.number().min(0).max(1).optional(),
  adNetwork: z.enum(["google_adsense", "meta_ads", "programmatic_dsp", "direct"]).optional(),
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
export type IntentBrandItem = z.infer<typeof IntentBrandItemSchema>;

export const IntentInsightsResponseSchema = z.object({
  brands: z.array(IntentBrandItemSchema).default([]),
  source: z.enum(["intent_engine", "google_adsense", "meta_ads", "fixture"]).default("intent_engine"),
});
export type IntentInsightsResponse = z.infer<typeof IntentInsightsResponseSchema>;

export const IntentTagItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
});
export type IntentTagItem = z.infer<typeof IntentTagItemSchema>;

export const IntentTagsResponseSchema = z.object({
  tags: z.array(IntentTagItemSchema).default([]),
  source: z.enum(["intent_engine", "google_adsense", "meta_ads", "fixture"]).default("intent_engine"),
});
export type IntentTagsResponse = z.infer<typeof IntentTagsResponseSchema>;

export const IntentCompareResponseSchema = z.object({
  affinityScore: z.number().min(0).max(1),
  sharedCategories: z.array(z.string()).default([]),
  sharedInterests: z.array(z.string()).default([]),
  source: z.enum(["intent_engine", "google_adsense", "meta_ads", "fixture"]).default("intent_engine"),
});
export type IntentCompareResponse = z.infer<typeof IntentCompareResponseSchema>;

// Aliases for backwards compatibility
export const QlooSearchResultItemSchema = IntentSearchResultItemSchema;
export type QlooSearchResultItem = IntentSearchResultItem;
export const QlooSearchResponseSchema = IntentSearchResponseSchema;
export type QlooSearchResponse = IntentSearchResponse;
export const QlooInsightBrandItemSchema = IntentBrandItemSchema;
export type QlooInsightBrandItem = IntentBrandItem;
export const QlooInsightsResponseSchema = IntentInsightsResponseSchema;
export type QlooInsightsResponse = IntentInsightsResponse;
export const QlooTagItemSchema = IntentTagItemSchema;
export type QlooTagItem = IntentTagItem;
export const QlooTagsResponseSchema = IntentTagsResponseSchema;
export type QlooTagsResponse = IntentTagsResponse;
export const QlooCompareResponseSchema = IntentCompareResponseSchema;
export type QlooCompareResponse = IntentCompareResponse;

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

export class IntentEngineClient {
  private apiKey: string;
  private baseUrl: string;
  private mode: "live" | "fixture";
  private cache = new SimpleLRUCache();
  private traces: DecisionTraceEntry[] = [];

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    mode?: "live" | "fixture";
  }) {
    this.apiKey =
      options?.apiKey ||
      process.env.INTENT_API_KEY ||
      process.env.GOOGLE_ADSENSE_API_KEY ||
      process.env.QLOO_API_KEY ||
      "";
    this.baseUrl =
      options?.baseUrl ||
      process.env.INTENT_BASE_URL ||
      process.env.QLOO_BASE_URL ||
      "https://ads.google.com/api/v1";

    const envMode = (
      process.env.INTENT_ENGINE_MODE ||
      process.env.QLOO_MODE ||
      ""
    ).toLowerCase();
    this.mode =
      options?.mode ||
      (this.apiKey && envMode !== "fixture" && envMode !== "simulated"
        ? "live"
        : "fixture");
  }

  getMode(): "live" | "fixture" {
    return this.mode;
  }

  getTraces(): DecisionTraceEntry[] {
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
    const safeParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k.toLowerCase().includes("key") || k.toLowerCase().includes("token") || k.toLowerCase().includes("secret")) {
        safeParams[k] = "[REDACTED]";
      } else {
        safeParams[k] = v;
      }
    }

    const entry: DecisionTraceEntry = {
      endpoint,
      params: safeParams,
      status,
      ms: Math.round(ms),
      cached,
    };
    this.traces.push(entry);
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
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 400));
      res = await execute();
    }
    return res;
  }

  /**
   * 1. Search: Intent Taxonomy & Entity URN resolver
   */
  async search(
    query: string,
    types?: string[],
    take = 5
  ): Promise<IntentSearchResponse> {
    const start = performance.now();
    const cacheKey = `search:${query}:${types?.join(",") || ""}:${take}`;
    const cached = this.cache.get<IntentSearchResponse>(cacheKey);

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
          Authorization: `Bearer ${this.apiKey}`,
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/search", { query, types, take }, res.status, ms, false);
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

      const parsed = IntentSearchResponseSchema.parse({
        results: items.map((it: Record<string, unknown>) => ({
          id: String(it.id || it.urn || `urn:entity:${query.toLowerCase().replace(/\s+/g, "_")}`),
          name: String(it.name || it.title || query),
          type: it.type ? String(it.type) : undefined,
          score: typeof it.score === "number" ? it.score : 1.0,
        })),
        source: "intent_engine",
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
   * Generic Insights: Retrieves affinity & intent scores across entity types
   */
  async insights(args: {
    type?: string;
    entityIds?: string[];
    tagIds?: string[];
    locationQuery?: string;
    excludeEntityIds?: string[];
    take?: number;
  }): Promise<{
    items: IntentBrandItem[];
    brands: IntentBrandItem[];
    source: "intent_engine" | "google_adsense" | "meta_ads" | "fixture";
  }> {
    const start = performance.now();
    const type = args.type || "brand";
    const take = args.take || 20;
    const cacheKey = `insights:${type}:${args.entityIds?.sort().join(",")}:${args.tagIds?.sort().join(",")}:${args.locationQuery || ""}:${take}`;
    const cached = this.cache.get<{
      items: IntentBrandItem[];
      brands: IntentBrandItem[];
      source: "intent_engine" | "google_adsense" | "meta_ads" | "fixture";
    }>(cacheKey);

    if (cached) {
      this.recordTrace("/v2/insights", { ...args, type, take }, 200, performance.now() - start, true);
      return cached;
    }

    if (this.mode === "fixture") {
      const fixtureRes = this.getInsightsFixture({ ...args, type });
      const res = {
        items: fixtureRes.brands,
        brands: fixtureRes.brands,
        source: "fixture" as const,
      };
      this.cache.set(cacheKey, res);
      this.recordTrace("/v2/insights", { ...args, type, take }, 200, performance.now() - start, false);
      return res;
    }

    try {
      const filterType = type.startsWith("urn:entity:") ? type : `urn:entity:${type}`;
      const params = new URLSearchParams({
        "filter.type": filterType,
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
          Authorization: `Bearer ${this.apiKey}`,
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/v2/insights", { ...args, type, take }, res.status, ms, false);
        const fixtureRes = this.getInsightsFixture({ ...args, type });
        return { items: fixtureRes.brands, brands: fixtureRes.brands, source: "fixture" };
      }

      const json = await res.json();
      const rawItems = Array.isArray(json)
        ? json
        : Array.isArray(json.brands)
        ? json.brands
        : Array.isArray(json.items)
        ? json.items
        : Array.isArray(json.results)
        ? json.results
        : Array.isArray(json.data)
        ? json.data
        : [];

      const parsedItems = rawItems.map((b: Record<string, unknown>) => {
        const queryObj = (b.query || {}) as Record<string, unknown>;
        const affinityVal =
          typeof queryObj.affinity === "number"
            ? queryObj.affinity
            : typeof b.affinity === "number"
            ? b.affinity
            : typeof b.score === "number"
            ? b.score
            : 0.5;

        const explainArray = Array.isArray(b.explainability)
          ? b.explainability.map((ex: Record<string, unknown>) => ({
              signal: String(ex.signal || ex.name || "Intent Match"),
              contribution: typeof ex.contribution === "number" ? ex.contribution : 0.2,
            }))
          : undefined;

        const cat = b.category ? String(b.category) : undefined;
        const isMetaCategory =
          cat === "beverage" || cat === "fashion" || cat === "lifestyle" || cat === "food";

        return {
          id: String(b.id || b.urn || `urn:entity:${type}:unknown`),
          name: String(b.name || b.title || "Entity"),
          affinity: Math.max(0, Math.min(1, affinityVal)),
          intentScore: Math.max(0, Math.min(1, affinityVal)),
          adNetwork: (isMetaCategory ? "meta_ads" : "google_adsense") as "google_adsense" | "meta_ads",
          explainability: explainArray,
          category: cat,
        };
      });

      const result = {
        items: parsedItems,
        brands: parsedItems,
        source: "intent_engine" as const,
      };

      this.cache.set(cacheKey, result);
      this.recordTrace("/v2/insights", { ...args, type, take }, 200, ms, false);
      return result;
    } catch {
      const ms = performance.now() - start;
      this.recordTrace("/v2/insights", { ...args, type, take }, 500, ms, false);
      const fixtureRes = this.getInsightsFixture({ ...args, type });
      return { items: fixtureRes.brands, brands: fixtureRes.brands, source: "fixture" };
    }
  }

  /**
   * 2. Brand Insights: Computes brand affinity & commercial intent
   */
  async brandInsights(args: {
    entityIds?: string[];
    tagIds?: string[];
    locationQuery?: string;
    excludeEntityIds?: string[];
    take?: number;
  }): Promise<IntentInsightsResponse> {
    const res = await this.insights({ ...args, type: "brand" });
    return { brands: res.brands, source: res.source };
  }

  /**
   * 3. Resolve Tags: Resolves scene mood & keywords into commercial intent tags
   */
  async resolveTags(term: string): Promise<IntentTagsResponse> {
    const start = performance.now();
    const cacheKey = `tags:${term.toLowerCase()}`;
    const cached = this.cache.get<IntentTagsResponse>(cacheKey);

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
          Authorization: `Bearer ${this.apiKey}`,
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

      const parsed = IntentTagsResponseSchema.parse({
        tags: rawTags.map((t: Record<string, unknown>) => ({
          id: String(t.id || `urn:tag:${term.toLowerCase().replace(/\s+/g, "_")}`),
          name: String(t.name || term),
          category: t.category ? String(t.category) : undefined,
        })),
        source: "intent_engine",
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
   * 4. Audiences: Audience clusters
   */
  async audiences(type?: string): Promise<{ audiences: Array<{ id: string; name: string }>; source: "intent_engine" | "fixture" }> {
    const start = performance.now();
    const cacheKey = `audiences:${type || ""}`;
    const cached = this.cache.get<{ audiences: Array<{ id: string; name: string }>; source: "intent_engine" | "fixture" }>(cacheKey);
    if (cached) return cached;

    if (this.mode === "fixture") {
      const res = {
        audiences: [
          { id: "aud_young_urban", name: "Young Urban Trendsetters (Google AdSense / Meta)" },
          { id: "aud_arts_culture", name: "Arts & Indie Enthusiasts" },
          { id: "aud_tech_early_adopters", name: "Tech Pioneers & Digital Creators" },
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
        headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      });
      const ms = performance.now() - start;
      if (!res.ok) throw new Error("Audiences error");
      const json = await res.json();
      const list = (json.audiences || json.data || []).map((a: Record<string, unknown>) => ({
        id: String(a.id || a.urn),
        name: String(a.name),
      }));
      const result = { audiences: list, source: "intent_engine" as const };
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
   * 5. Compare: Cross-category intent overlap
   */
  async compare(aIds: string[], bIds: string[]): Promise<IntentCompareResponse> {
    const start = performance.now();
    const cacheKey = `compare:${aIds.sort().join(",")}:${bIds.sort().join(",")}`;
    const cached = this.cache.get<IntentCompareResponse>(cacheKey);
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
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      });

      const ms = performance.now() - start;
      if (!res.ok) {
        this.recordTrace("/v2/insights/compare", { aIds, bIds }, res.status, ms, false);
        return this.getCompareFixture(aIds, bIds);
      }

      const json = await res.json();
      const parsed = IntentCompareResponseSchema.parse({
        affinityScore: typeof json.affinity === "number" ? json.affinity : 0.74,
        sharedCategories: json.categories || ["coffee", "music", "books"],
        sharedInterests: json.interests || ["Specialty Coffee", "Indie Cinema", "Minimalist Design"],
        source: "intent_engine",
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

  private getSearchFixture(query: string, types?: string[], take = 5): IntentSearchResponse {
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
    type?: string;
    entityIds?: string[];
    tagIds?: string[];
    locationQuery?: string;
  }): IntentInsightsResponse {
    const loc = (args.locationQuery || "").toLowerCase();
    const type = (args.type || "").toLowerCase();

    // Entity Type: Artist
    if (type.includes("artist") || type.includes("music")) {
      if (loc.includes("japan") || loc.includes("tokyo")) {
        return {
          brands: [
            { id: "urn:entity:artist:ryuichi_sakamoto", name: "Ryuichi Sakamoto", affinity: 0.95, category: "music", explainability: [{ signal: "Ambient electronic & neo-classical scoring", contribution: 0.55 }] },
            { id: "urn:entity:artist:cornelius", name: "Cornelius", affinity: 0.89, category: "music", explainability: [{ signal: "Shibuya-kei audio-visual design", contribution: 0.46 }] },
            { id: "urn:entity:artist:midori_takada", name: "Midori Takada", affinity: 0.85, category: "music", explainability: [{ signal: "Japanese environmental percussion", contribution: 0.42 }] },
            { id: "urn:entity:artist:nujabes", name: "Nujabes", affinity: 0.83, category: "music", explainability: [{ signal: "Tokyo lo-fi jazz-hop", contribution: 0.39 }] },
          ],
          source: "fixture",
        };
      }
      if (loc.includes("india") || loc.includes("visakhapatnam") || loc.includes("mumbai") || loc.includes("bengaluru")) {
        return {
          brands: [
            { id: "urn:entity:artist:ar_rahman", name: "A.R. Rahman", affinity: 0.96, category: "music", explainability: [{ signal: "Symphonic soundtrack innovation", contribution: 0.56 }] },
            { id: "urn:entity:artist:divine", name: "Divine", affinity: 0.89, category: "music", explainability: [{ signal: "Gully street rap culture", contribution: 0.47 }] },
            { id: "urn:entity:artist:prateek_kuhad", name: "Prateek Kuhad", affinity: 0.86, category: "music", explainability: [{ signal: "Acoustic indie folk songwriting", contribution: 0.41 }] },
          ],
          source: "fixture",
        };
      }
      return {
        brands: [
          { id: "urn:entity:artist:tyler_the_creator", name: "Tyler, The Creator", affinity: 0.95, category: "music", explainability: [{ signal: "Alternative hip-hop & pastel streetwear", contribution: 0.52 }] },
          { id: "urn:entity:artist:steve_lacy", name: "Steve Lacy", affinity: 0.89, category: "music", explainability: [{ signal: "DIY neo-soul guitar grooves", contribution: 0.45 }] },
          { id: "urn:entity:artist:lcd_soundsystem", name: "LCD Soundsystem", affinity: 0.85, category: "music", explainability: [{ signal: "Brooklyn dance-punk & modular synth", contribution: 0.40 }] },
        ],
        source: "fixture",
      };
    }

    // Entity Type: Movie / Film / TV
    if (type.includes("movie") || type.includes("film") || type.includes("tv")) {
      if (loc.includes("japan") || loc.includes("tokyo")) {
        return {
          brands: [
            { id: "urn:entity:movie:drive_my_car", name: "Drive My Car", affinity: 0.94, category: "film", explainability: [{ signal: "Haruki Murakami literary adaptation", contribution: 0.56 }] },
            { id: "urn:entity:movie:lost_in_translation", name: "Lost In Translation", affinity: 0.90, category: "film", explainability: [{ signal: "Tokyo neon atmosphere & quiet drama", contribution: 0.47 }] },
            { id: "urn:entity:movie:perfect_days", name: "Perfect Days", affinity: 0.88, category: "film", explainability: [{ signal: "Tokyo minimalist aesthetic & cassette culture", contribution: 0.44 }] },
          ],
          source: "fixture",
        };
      }
      if (loc.includes("india") || loc.includes("visakhapatnam") || loc.includes("mumbai") || loc.includes("bengaluru")) {
        return {
          brands: [
            { id: "urn:entity:movie:rrr", name: "RRR", affinity: 0.96, category: "film", explainability: [{ signal: "Heroic folklore spectacle & momentum", contribution: 0.57 }] },
            { id: "urn:entity:movie:gully_boy", name: "Gully Boy", affinity: 0.90, category: "film", explainability: [{ signal: "Street authenticity & youth aspiration", contribution: 0.46 }] },
          ],
          source: "fixture",
        };
      }
      return {
        brands: [
          { id: "urn:entity:movie:eeao", name: "Everything Everywhere All At Once", affinity: 0.95, category: "film", explainability: [{ signal: "A24 maximalist cinematic storytelling", contribution: 0.54 }] },
          { id: "urn:entity:movie:past_lives", name: "Past Lives", affinity: 0.91, category: "film", explainability: [{ signal: "Contemporary urban yearning & romance", contribution: 0.48 }] },
          { id: "urn:entity:movie:severance", name: "Severance", affinity: 0.87, category: "tv", explainability: [{ signal: "Minimalist corporate dystopia", contribution: 0.42 }] },
        ],
        source: "fixture",
      };
    }

    // Entity Type: Place / Destination
    if (type.includes("place") || type.includes("travel")) {
      if (loc.includes("japan") || loc.includes("tokyo")) {
        return {
          brands: [
            { id: "urn:entity:place:daikanyama_tsite", name: "Daikanyama T-Site", affinity: 0.95, category: "place", explainability: [{ signal: "Architectural book palace & artisan cafe", contribution: 0.55 }] },
            { id: "urn:entity:place:shimokitazawa", name: "Shimokitazawa Vinyl Alley", affinity: 0.91, category: "place", explainability: [{ signal: "Indie record shops & vintage apparel", contribution: 0.48 }] },
            { id: "urn:entity:place:meiji_forest", name: "Meiji Shrine Canopy", affinity: 0.87, category: "place", explainability: [{ signal: "Mindful cedar sanctuary", contribution: 0.42 }] },
          ],
          source: "fixture",
        };
      }
      if (loc.includes("india") || loc.includes("visakhapatnam") || loc.includes("mumbai") || loc.includes("bengaluru")) {
        return {
          brands: [
            { id: "urn:entity:place:fort_kochi", name: "Fort Kochi Biennale", affinity: 0.93, category: "place", explainability: [{ signal: "Historic coastal spice warehouse arts", contribution: 0.52 }] },
            { id: "urn:entity:place:hauz_khas", name: "Hauz Khas Village", affinity: 0.89, category: "place", explainability: [{ signal: "Heritage ruins & indie design studios", contribution: 0.46 }] },
          ],
          source: "fixture",
        };
      }
      return {
        brands: [
          { id: "urn:entity:place:dumbo_brooklyn", name: "Dumbo Brooklyn Waterfront", affinity: 0.94, category: "place", explainability: [{ signal: "Cobblestone industrial loft aesthetic", contribution: 0.51 }] },
          { id: "urn:entity:place:high_line", name: "High Line Chelsea", affinity: 0.90, category: "place", explainability: [{ signal: "Elevated urban park & public sculpture", contribution: 0.46 }] },
          { id: "urn:entity:place:soho_design", name: "SoHo Design District", affinity: 0.87, category: "place", explainability: [{ signal: "Cast iron facades & artisan retail", contribution: 0.42 }] },
        ],
        source: "fixture",
      };
    }

    // Default: Brand Insights across Google AdSense & Meta Ads
    // 1. United States -> RepBull Energy (0.96)
    if (loc.includes("united states") || loc.includes("us") || loc.includes("america") || loc.includes("san francisco") || loc.includes("seattle") || loc.includes("new york")) {
      return {
        brands: [
          {
            id: "urn:entity:brand:repbull_energy",
            name: "RepBull Energy",
            affinity: 0.96,
            intentScore: 0.96,
            adNetwork: "meta_ads",
            category: "beverage",
            explainability: [
              { signal: "Formula 1 & extreme sports consumer purchase intent", contribution: 0.54 },
              { signal: "Meta Ads lifestyle & action gaming audience index", contribution: 0.42 },
            ],
          },
          {
            id: "urn:entity:brand:lumina_audio",
            name: "Lumina Spatial Sound",
            affinity: 0.88,
            intentScore: 0.88,
            adNetwork: "google_adsense",
            category: "audio",
            explainability: [{ signal: "Google AdSense high-intent spatial audio search intent", contribution: 0.45 }],
          },
          {
            id: "urn:entity:brand:folio_press",
            name: "Folio & Horizon Press",
            affinity: 0.82,
            intentScore: 0.82,
            adNetwork: "google_adsense",
            category: "books",
            explainability: [{ signal: "Speculative fiction reader intent score", contribution: 0.40 }],
          },
          {
            id: "urn:entity:brand:solstice_atelier",
            name: "Atelier Solstice",
            affinity: 0.78,
            intentScore: 0.78,
            adNetwork: "meta_ads",
            category: "fashion",
            explainability: [{ signal: "Instagram outdoor performance apparel buyer intent", contribution: 0.40 }],
          },
          {
            id: "urn:entity:brand:kissa_coffee",
            name: "Kissa Craft Roasters",
            affinity: 0.75,
            intentScore: 0.75,
            adNetwork: "meta_ads",
            category: "coffee",
            explainability: [{ signal: "Specialty cold brew consumer affinity", contribution: 0.38 }],
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
            intentScore: 0.94,
            adNetwork: "meta_ads" as const,
            category: "coffee",
            explainability: [
              { signal: "Shibuya specialty coffee consumer intent", contribution: 0.52 },
              { signal: "Meta café culture engagement index", contribution: 0.42 },
            ],
          }
        : {
            id: "urn:entity:brand:sony_alpha",
            name: "Sony Alpha Optics",
            affinity: 0.96,
            intentScore: 0.96,
            adNetwork: "google_adsense" as const,
            category: "electronics",
            explainability: [
              { signal: "Google AdSense mirrorless optics high-intent search score", contribution: 0.55 },
              { signal: "Tokyo street photography contextual RTB auction match", contribution: 0.41 },
            ],
          };

      const secondBrand = isMurakami
        ? {
            id: "urn:entity:brand:sony_alpha",
            name: "Sony Alpha Optics",
            affinity: 0.91,
            intentScore: 0.91,
            adNetwork: "google_adsense" as const,
            category: "electronics",
            explainability: [
              { signal: "Tokyo street photography contextual match", contribution: 0.41 },
            ],
          }
        : {
            id: "urn:entity:brand:kissa_coffee",
            name: "Kissa Craft Roasters",
            affinity: 0.89,
            intentScore: 0.89,
            adNetwork: "meta_ads" as const,
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
            intentScore: 0.85,
            adNetwork: "google_adsense",
            category: "audio",
            explainability: [{ signal: "Hi-res lossless spatial audio intent", contribution: 0.42 }],
          },
          {
            id: "urn:entity:brand:solstice_atelier",
            name: "Atelier Solstice",
            affinity: 0.79,
            intentScore: 0.79,
            adNetwork: "meta_ads",
            category: "fashion",
            explainability: [{ signal: "Minimalist technical rainwear intent", contribution: 0.38 }],
          },
          {
            id: "urn:entity:brand:repbull_energy",
            name: "RepBull Energy",
            affinity: 0.65,
            intentScore: 0.65,
            adNetwork: "meta_ads",
            category: "beverage",
            explainability: [{ signal: "Energy drink baseline engagement", contribution: 0.30 }],
          },
        ],
        source: "fixture",
      };
    }

    // 3. India -> MRF ZLX Tyres (0.97)
    if (loc.includes("india") || loc.includes("visakhapatnam") || loc.includes("mumbai") || loc.includes("bengaluru") || loc.includes("delhi")) {
      return {
        brands: [
          {
            id: "urn:entity:brand:mrf_tyres",
            name: "MRF ZLX Tyres",
            affinity: 0.97,
            intentScore: 0.97,
            adNetwork: "google_adsense",
            category: "automotive",
            explainability: [
              { signal: "Google AdSense premium tyre replacement intent", contribution: 0.58 },
              { signal: "Cricket broadcast & highway safety contextual affinity", contribution: 0.39 },
            ],
          },
          {
            id: "urn:entity:brand:malabar_tea",
            name: "Malabar Hill Spiced Tea",
            affinity: 0.89,
            intentScore: 0.89,
            adNetwork: "meta_ads",
            category: "beverage",
            explainability: [{ signal: "Meta artisanal tea & filter coffee culture index", contribution: 0.48 }],
          },
          {
            id: "urn:entity:brand:lumina_audio",
            name: "Lumina Spatial Sound",
            affinity: 0.81,
            intentScore: 0.81,
            adNetwork: "google_adsense",
            category: "audio",
            explainability: [{ signal: "Cinematic dialogue clarity audio intent", contribution: 0.40 }],
          },
          {
            id: "urn:entity:brand:solstice_atelier",
            name: "Atelier Solstice",
            affinity: 0.74,
            intentScore: 0.74,
            adNetwork: "meta_ads",
            category: "fashion",
            explainability: [{ signal: "Breathable linen & handloom urban wear", contribution: 0.35 }],
          },
          {
            id: "urn:entity:brand:repbull_energy",
            name: "RepBull Energy",
            affinity: 0.68,
            intentScore: 0.68,
            adNetwork: "meta_ads",
            category: "beverage",
            explainability: [{ signal: "Motorsport & gaming youth demographic", contribution: 0.33 }],
          },
        ],
        source: "fixture",
      };
    }

    // Default global fallback
    return {
      brands: [
        {
          id: "urn:entity:brand:sony_alpha",
          name: "Sony Alpha Optics",
          affinity: 0.92,
          intentScore: 0.92,
          adNetwork: "google_adsense",
          category: "electronics",
          explainability: [{ signal: "Contextual cinematography intent", contribution: 0.50 }],
        },
        {
          id: "urn:entity:brand:repbull_energy",
          name: "RepBull Energy",
          affinity: 0.88,
          intentScore: 0.88,
          adNetwork: "meta_ads",
          category: "beverage",
          explainability: [{ signal: "High-energy media audience intent", contribution: 0.45 }],
        },
        {
          id: "urn:entity:brand:mrf_tyres",
          name: "MRF ZLX Tyres",
          affinity: 0.84,
          intentScore: 0.84,
          adNetwork: "google_adsense",
          category: "automotive",
          explainability: [{ signal: "Transit & highway safety intent", contribution: 0.40 }],
        },
        {
          id: "urn:entity:brand:kissa_coffee",
          name: "Kissa Craft Roasters",
          affinity: 0.80,
          intentScore: 0.80,
          adNetwork: "meta_ads",
          category: "coffee",
          explainability: [{ signal: "Specialty culinary intent", contribution: 0.35 }],
        },
      ],
      source: "fixture",
    };
  }

  private getTagsFixture(term: string): IntentTagsResponse {
    const tLower = term.toLowerCase();
    const tagMap: Record<string, Array<{ id: string; name: string; category?: string }>> = {
      neon: [
        { id: "urn:tag:neon_aesthetic", name: "Neon Aesthetic", category: "visual" },
        { id: "urn:tag:cyberpunk", name: "Cyberpunk", category: "genre" },
        { id: "urn:tag:tokyo_nightlife", name: "Tokyo Nightlife", category: "location" },
      ],
      noir: [
        { id: "urn:tag:neo_noir", name: "Neo Noir", category: "genre" },
        { id: "urn:tag:moody_lighting", name: "Moody Lighting", category: "cinematography" },
      ],
      cozy: [
        { id: "urn:tag:cozy_cafe", name: "Cozy Café", category: "lifestyle" },
        { id: "urn:tag:warm_lighting", name: "Warm Lighting", category: "visual" },
      ],
      rain: [
        { id: "urn:tag:rainy_atmosphere", name: "Rainy Atmosphere", category: "mood" },
        { id: "urn:tag:reflective_pavement", name: "Reflective Pavement", category: "visual" },
      ],
      urban: [
        { id: "urn:tag:street_culture", name: "Street Culture", category: "lifestyle" },
        { id: "urn:tag:metropolis", name: "Metropolis", category: "location" },
      ],
      night: [
        { id: "urn:tag:after_dark", name: "After Dark", category: "mood" },
        { id: "urn:tag:neon_city", name: "Neon City", category: "visual" },
      ],
    };

    const matched = tagMap[tLower] || [
      {
        id: `urn:tag:${tLower.replace(/\s+/g, "_")}`,
        name: term,
        category: "general",
      },
    ];

    return {
      tags: matched,
      source: "fixture",
    };
  }

  private getCompareFixture(aIds: string[], bIds: string[]): IntentCompareResponse {
    const isTokyo = aIds.some((id) => id.includes("tokyo") || id.includes("sony") || id.includes("murakami")) ||
                    bIds.some((id) => id.includes("tokyo") || id.includes("sony") || id.includes("murakami"));
    const isUs = aIds.some((id) => id.includes("repbull") || id.includes("formula")) ||
                 bIds.some((id) => id.includes("repbull") || id.includes("formula"));

    if (isTokyo && isUs) {
      return {
        affinityScore: 0.78,
        sharedCategories: ["coffee", "music", "books", "electronics", "extreme_sports"],
        sharedInterests: ["High-Performance Technology", "Night Photography", "Gaming"],
        source: "fixture",
      };
    }

    return {
      affinityScore: 0.72,
      sharedCategories: ["coffee", "music", "books", "urban_culture"],
      sharedInterests: ["Independent Cinema", "Artisanal Coffee", "Modernist Design"],
      source: "fixture",
    };
  }
}

// Singleton IntentEngineClient accessor
let globalIntentClient: IntentEngineClient | null = null;

export function getIntentClient(): IntentEngineClient {
  if (!globalIntentClient) {
    globalIntentClient = new IntentEngineClient();
  }
  return globalIntentClient;
}

// Reset singleton (useful for isolated tests)
export function resetIntentClient(newClient?: IntentEngineClient): void {
  globalIntentClient = newClient || null;
}
