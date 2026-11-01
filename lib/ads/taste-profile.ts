import { Cohort, TasteProfile, TasteTag, TasteEntity, QlooTraceEntry } from "../schema";
import { QlooClient, getQlooClient } from "../qloo/client";

// Generic / Stop tags to remove from taste scoring
const GENERIC_STOP_WORDS = new Set([
  "thing",
  "entity",
  "item",
  "general",
  "all",
  "other",
  "misc",
  "generic",
  "category",
  "person",
  "place",
  "brand",
  "correlation",
  "index",
  "fan",
  "interest",
  "affinity",
  "match",
  "preference",
]);

/**
 * Extracts normalized clean tag names from a raw signal or phrase
 */
function extractTagNames(signalOrTerm: string): string[] {
  return signalOrTerm
    .toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !GENERIC_STOP_WORDS.has(w));
}

/**
 * Builds a taste profile for a target audience cohort using Qloo's taste graph
 */
export async function buildTasteProfile(
  cohort: Cohort,
  options?: {
    client?: QlooClient;
    keywords?: string[];
  }
): Promise<TasteProfile> {
  const client = options?.client || getQlooClient();
  const tracesBefore = client.getTraces().length;

  // 1. Parallel search of cohort anchors into entity IDs
  const anchorSearches = await Promise.all(
    cohort.anchors.slice(0, 5).map(async (anchor) => {
      try {
        const res = await client.search(anchor, undefined, 3);
        return { anchor, res, failed: false };
      } catch {
        return { anchor, res: null, failed: true };
      }
    })
  );

  const entityIds = anchorSearches.flatMap(
    (s) => s.res?.results.map((r) => r.id) || []
  );

  // Parallel tag resolution for anchors & brief keywords
  const tagTerms = [...cohort.anchors, ...(options?.keywords || [])].slice(0, 6);
  const tagResolutions = await Promise.all(
    tagTerms.map(async (term) => {
      try {
        return await client.resolveTags(term);
      } catch {
        return null;
      }
    })
  );

  // 2. Qloo Insights for multiple entity categories with location query
  const locationQuery = `${cohort.city}, ${cohort.country}`;

  let hasLiveError = false;
  let isAllFixture = client.getMode() === "fixture";

  const [artistRes, movieRes, placeRes, brandRes] = await Promise.all([
    client.insights({ type: "artist", locationQuery, entityIds, take: 5 }).catch(() => {
      hasLiveError = true;
      return { items: [], brands: [], source: "fixture" as const };
    }),
    client.insights({ type: "movie", locationQuery, entityIds, take: 5 }).catch(() => {
      hasLiveError = true;
      return { items: [], brands: [], source: "fixture" as const };
    }),
    client.insights({ type: "place", locationQuery, entityIds, take: 5 }).catch(() => {
      hasLiveError = true;
      return { items: [], brands: [], source: "fixture" as const };
    }),
    client.brandInsights({ locationQuery, entityIds, take: 5 }).catch(() => {
      hasLiveError = true;
      return { brands: [], source: "fixture" as const };
    }),
  ]);

  if (
    artistRes.source === "fixture" ||
    movieRes.source === "fixture" ||
    placeRes.source === "fixture" ||
    brandRes.source === "fixture"
  ) {
    if (client.getMode() !== "fixture") {
      hasLiveError = true;
    } else {
      isAllFixture = true;
    }
  }

  // 3. Compile top entities across domains
  const topEntities: TasteEntity[] = [
    ...artistRes.items.map((i) => ({ type: "artist", name: i.name, affinity: i.affinity })),
    ...movieRes.items.map((i) => ({ type: "movie", name: i.name, affinity: i.affinity })),
    ...placeRes.items.map((i) => ({ type: "place", name: i.name, affinity: i.affinity })),
    ...brandRes.brands.map((i) => ({ type: "brand", name: i.name, affinity: i.affinity })),
  ]
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, 10);

  // 4. Collect top tags across explainability signals & resolved tags, weighted by affinity
  const tagWeights = new Map<string, number>();

  const allInsightItems = [
    ...artistRes.items,
    ...movieRes.items,
    ...placeRes.items,
    ...brandRes.brands,
  ];

  for (const item of allInsightItems) {
    if (item.explainability && item.explainability.length > 0) {
      for (const exp of item.explainability) {
        const tokens = extractTagNames(exp.signal);
        const weight = item.affinity * (exp.contribution || 0.4);
        for (const token of tokens) {
          tagWeights.set(token, (tagWeights.get(token) || 0) + weight);
        }
      }
    }
    // Also include category if present
    if (item.category) {
      const catTokens = extractTagNames(item.category);
      for (const ct of catTokens) {
        tagWeights.set(ct, (tagWeights.get(ct) || 0) + item.affinity * 0.3);
      }
    }
  }

  // Add explicit tag resolution hits
  for (const tr of tagResolutions) {
    if (tr && tr.tags) {
      for (const t of tr.tags) {
        const words = extractTagNames(t.name);
        for (const w of words) {
          tagWeights.set(w, (tagWeights.get(w) || 0) + 0.5);
        }
      }
    }
  }

  // Normalize weights to 0..1 and pick top 8
  const maxWeight = Math.max(...Array.from(tagWeights.values()), 1.0);
  const sortedTags: TasteTag[] = Array.from(tagWeights.entries())
    .map(([name, rawWeight]) => ({
      id: `tag-${name}`,
      name,
      weight: Math.round((rawWeight / maxWeight) * 100) / 100,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  // Capture traces recorded during this taste profile generation
  const allTraces = client.getTraces();
  const traces: QlooTraceEntry[] = allTraces.slice(tracesBefore);

  let source: "qloo" | "fixture" | "fallback" = "qloo";
  if (isAllFixture) {
    source = "fixture";
  } else if (hasLiveError) {
    source = "fallback";
  }

  return {
    topTags: sortedTags,
    topEntities,
    traces,
    source,
  };
}
