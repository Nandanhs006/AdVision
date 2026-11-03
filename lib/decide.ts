import {
  Viewer,
  Zone,
  Rules,
  Campaign,
  Decision,
  RankedCampaign,
  DecisionTraceEntry,
} from "./schema";
import { IntentEngineClient, getIntentClient } from "./intent/client";

export interface DecisionOptions {
  zone: Zone;
  rules: Rules;
  viewer: Viewer;
  campaigns: Campaign[];
  intentClient?: IntentEngineClient;
  qlooClient?: IntentEngineClient; // Backward compatibility alias
  now?: string; // YYYY-MM-DD for deterministic testing
  llmExplainer?: (data: {
    winnerName: string;
    affinity: number;
    city: string;
    signals: string[];
  }) => Promise<string>;
}

/**
 * Pure, deterministic rules & scoring pipeline
 */
export async function runDecisionPipeline(options: DecisionOptions): Promise<Decision> {
  const intentClient = options.intentClient || options.qlooClient || getIntentClient();
  const { zone, rules, viewer, campaigns, now = "2026-10-31" } = options;

  const traces: DecisionTraceEntry[] = [];
  const reasons: string[] = [];

  // ==========================================
  // Step 1: Shortcuts (Kids & Ad-Free)
  // ==========================================
  if (viewer.adPreference === "adfree") {
    reasons.push("Viewer is on an ad-free subscriber tier. Commercial promotions suppressed.");
    return {
      zoneId: zone.id,
      viewerId: viewer.id,
      winner: "neutral",
      ranked: [],
      reasons,
      trace: [],
      explanation: `Subscriber ${viewer.name} is on an ad-free plan. Neutral in-scene architectural artwork displayed.`,
      source: "fallback",
      status: "approved",
    };
  }

  if (viewer.adPreference === "kids") {
    reasons.push("Viewer is on a kids profile. Only verified public-service campaigns are eligible.");
    const psaCampaigns = campaigns.filter((c) => c.publicService);
    // Prefer matching language
    const psaMatch =
      psaCampaigns.find((c) => c.languages.includes(viewer.language)) ||
      psaCampaigns[0];

    const winnerId = psaMatch ? psaMatch.id : "psa";
    return {
      zoneId: zone.id,
      viewerId: viewer.id,
      winner: winnerId,
      winningCampaign: psaMatch,
      ranked: psaCampaigns.map((c) => ({
        campaignId: c.id,
        brandName: c.brandName,
        category: c.category,
        intentScore: 1.0,
        qlooAffinity: 1.0,
        finalScore: 1.0,
        status: c.id === winnerId ? "selected" : "allowed",
        reason: "Public service campaign eligible for kids profile",
      })),
      reasons,
      trace: [],
      explanation: `Kids profile detected for ${viewer.name}. Showing civic announcement: ${psaMatch?.brandName || "Civic Message"}.`,
      source: "fallback",
      status: "approved",
    };
  }

  // ==========================================
  // Step 2: Resolve Signals
  // ==========================================
  const searchPromises = viewer.favorites.slice(0, 5).map((fav) =>
    intentClient.search(fav, undefined, 1)
  );
  const searchResults = await Promise.all(searchPromises);
  const resolvedEntityIds: string[] = [];
  searchResults.forEach((res) => {
    if (res.results[0]?.id) {
      resolvedEntityIds.push(res.results[0].id);
    }
  });

  // Resolve scene mood tags
  const moodTagPromises = (rules.sceneMood.length > 0 ? rules.sceneMood.slice(0, 4) : ["urban", "neon"]).map((m) =>
    intentClient.resolveTags(m)
  );
  const moodResults = await Promise.all(moodTagPromises);
  const resolvedTagIds: string[] = [];
  moodResults.forEach((tRes) => {
    if (tRes.tags[0]?.id) {
      resolvedTagIds.push(tRes.tags[0].id);
    }
  });

  // ==========================================
  // Step 3: Intent Classification & Ad Network Ranking
  // ==========================================
  const insightsRes = await intentClient.brandInsights({
    entityIds: resolvedEntityIds,
    tagIds: resolvedTagIds,
    locationQuery: viewer.country || viewer.city,
    take: 50,
  });

  // Collect trace entries recorded during this request
  traces.push(...intentClient.getTraces());

  const brandAffinityMap = new Map<string, { affinity: number; explainability?: Array<{ signal: string; contribution: number }> }>();
  insightsRes.brands.forEach((b) => {
    brandAffinityMap.set(b.id, {
      affinity: b.affinity,
      explainability: b.explainability,
    });
  });

  // ==========================================
  // Step 4 & 5: Join & Deterministic Rules Filter
  // ==========================================
  const ranked: RankedCampaign[] = [];

  for (const camp of campaigns) {
    // Check if commercial campaign or PSA
    if (camp.publicService) {
      continue; // PSAs are fallbacks, not commercial contenders
    }

    let intentScore = 0;
    let notInTopTier = false;
    const entityUrn = camp.intentEntityId || camp.qlooEntityId;

    if (entityUrn && brandAffinityMap.has(entityUrn)) {
      const info = brandAffinityMap.get(entityUrn)!;
      intentScore = info.affinity;
    } else {
      // Tag overlap fallback score capped at 0.5
      notInTopTier = true;
      const favLower = viewer.favorites.map((f) => f.toLowerCase());
      const moodLower = rules.sceneMood.map((m) => m.toLowerCase());
      const combinedViewerInterests = [...favLower, ...moodLower];

      let overlap = 0;
      camp.tags.forEach((t) => {
        if (combinedViewerInterests.some((vi) => vi.includes(t.toLowerCase()) || t.toLowerCase().includes(vi))) {
          overlap += 1;
        }
      });
      intentScore = Math.min(0.5, (overlap / Math.max(1, camp.tags.length)) * 0.5);
    }

    // Rules Evaluation
    // 1. Flight expiration
    const flightStart = camp.flight.start;
    const flightEnd = camp.flight.end;
    if (now < flightStart || now > flightEnd) {
      ranked.push({
        campaignId: camp.id,
        brandName: camp.brandName,
        category: camp.category,
        intentScore,
        qlooAffinity: intentScore,
        finalScore: 0,
        status: "expired",
        reason: `Campaign flight ended on ${flightEnd} (current: ${now})`,
      });
      continue;
    }

    // 2. Blocked categories
    if (rules.blockedCategories.map((c) => c.toLowerCase()).includes(camp.category.toLowerCase())) {
      ranked.push({
        campaignId: camp.id,
        brandName: camp.brandName,
        category: camp.category,
        intentScore,
        qlooAffinity: intentScore,
        finalScore: 0,
        status: "blocked",
        reason: `Category '${camp.category}' is explicitly blocked by editor rules`,
      });
      continue;
    }

    // 3. Allowed categories (when whitelist is set)
    if (
      rules.allowedCategories.length > 0 &&
      !rules.allowedCategories.map((c) => c.toLowerCase()).includes(camp.category.toLowerCase())
    ) {
      ranked.push({
        campaignId: camp.id,
        brandName: camp.brandName,
        category: camp.category,
        intentScore,
        qlooAffinity: intentScore,
        finalScore: 0,
        status: "blocked",
        reason: `Category '${camp.category}' is not in editor's allowed categories`,
      });
      continue;
    }

    // 4. Prominence Cap
    if (zone.frameShare > rules.prominenceCap) {
      ranked.push({
        campaignId: camp.id,
        brandName: camp.brandName,
        category: camp.category,
        intentScore,
        qlooAffinity: intentScore,
        finalScore: 0,
        status: "capped",
        reason: `Zone area (${(zone.frameShare * 100).toFixed(1)}%) exceeds prominence cap (${(rules.prominenceCap * 100).toFixed(1)}%)`,
      });
      continue;
    }

    // 5. Language & Country tie-breaker bonus (max +0.1)
    let tieBreaker = 0;
    if (camp.languages.includes(viewer.language)) {
      tieBreaker += 0.05;
    }
    if (camp.countries && camp.countries.includes(viewer.country)) {
      tieBreaker += 0.05;
    }

    const finalScore = Number((intentScore + tieBreaker).toFixed(4));
    const status = notInTopTier ? "not_in_intent_top" : "allowed";

    // Intent classification & Ad Network routing (Google AdSense vs Meta Ads)
    const catLower = camp.category.toLowerCase();
    const adNetwork =
      catLower.includes("tech") || catLower.includes("auto") || catLower.includes("electronics")
        ? "google_adsense"
        : catLower.includes("beverage") || catLower.includes("apparel") || catLower.includes("fashion") || catLower.includes("lifestyle")
        ? "meta_ads"
        : "google_adsense";

    ranked.push({
      campaignId: camp.id,
      brandName: camp.brandName,
      category: camp.category,
      intentScore,
      qlooAffinity: intentScore,
      adNetwork,
      intentSignals: viewer.favorites.slice(0, 3),
      finalScore,
      status,
      reason: notInTopTier
        ? "Not in top tier intent index, evaluated via tag overlap fallback score"
        : `Intent-based match (${(intentScore * 100).toFixed(0)}%) via ${adNetwork === "google_adsense" ? "Google AdSense" : "Meta Ads"} with ${tieBreaker > 0 ? `+${(tieBreaker * 100).toFixed(0)}% localized tie-breaker` : "standard weighting"}`,
    });
  }

  // ==========================================
  // Step 6: Select Winner
  // ==========================================
  // Sort candidates by final score descending
  ranked.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  const eligibleCandidates = ranked.filter(
    (r) => r.status === "allowed" || r.status === "not_in_intent_top" || (r.status as string) === "not_in_qloo_top"
  );

  let winnerId: string = "neutral";
  let winningCampaign: Campaign | undefined;
  let decisionStatus: "approved" | "pending" | "bypassed" = "approved";

  if (eligibleCandidates.length > 0) {
    const topPick = eligibleCandidates[0];
    winnerId = topPick.campaignId;
    winningCampaign = campaigns.find((c) => c.id === winnerId);
    topPick.status = "selected";

    if (rules.requireApproval) {
      decisionStatus = "pending";
      reasons.push("Editor rule requires manual review: decision held in pending approval status.");
    }
  } else {
    // Fallback to Public Service Announcement
    const psa = campaigns.find((c) => c.publicService);
    if (psa) {
      winnerId = psa.id;
      winningCampaign = psa;
      reasons.push("No commercial campaign passed editor rules. Rendering public service announcement.");
    } else {
      winnerId = "neutral";
      reasons.push("No campaigns passed editor rules. Rendering neutral background artwork.");
    }
  }

  // ==========================================
  // Step 7: Explain Pick
  // ==========================================
  let explanation = "";
  if (winningCampaign && winningCampaign.publicService) {
    explanation = `Displaying civic public announcement for ${winningCampaign.brandName} as no commercial sponsors matched editor constraints.`;
  } else if (winningCampaign) {
    const topRanked = ranked.find((r) => r.campaignId === winnerId);
    const affinityPct = Math.round(((topRanked?.intentScore ?? topRanked?.qlooAffinity) || 0) * 100);

    // Get signals if available
    const entityUrn = winningCampaign.intentEntityId || winningCampaign.qlooEntityId || "";
    const signals = brandAffinityMap.get(entityUrn)?.explainability;
    const signalText = signals && signals.length > 0
      ? ` driven by ${signals.map((s) => s.signal).join(" and ")}`
      : ` aligned with ${viewer.city} local preferences`;

    const winningNet =
      winningCampaign.category.toLowerCase().includes("tech") || winningCampaign.category.toLowerCase().includes("auto")
        ? "Google AdSense"
        : winningCampaign.category.toLowerCase().includes("beverage") || winningCampaign.category.toLowerCase().includes("lifestyle")
        ? "Meta Ads"
        : "Google AdSense";

    explanation = `SceneCast intent engine matched ${winningCampaign.brandName} with ${affinityPct}% affinity for ${viewer.name}${signalText} via ${winningNet} contextual intelligence. All editorial rules for category, flight dates, and prominence were validated.`;

    if (options.llmExplainer) {
      try {
        const llmExp = await options.llmExplainer({
          winnerName: winningCampaign.brandName,
          affinity: affinityPct,
          city: viewer.city,
          signals: signals?.map((s) => s.signal) || [],
        });
        if (llmExp && llmExp.includes(String(affinityPct))) {
          explanation = llmExp;
        }
      } catch {
        // Keep deterministic explanation if LLM fails
      }
    }
  } else {
    explanation = `Neutral in-scene texture rendered for ${viewer.name} in accordance with editorial rules.`;
  }

  return {
    zoneId: zone.id,
    viewerId: viewer.id,
    winner: winnerId,
    winningCampaign,
    ranked,
    reasons,
    trace: traces,
    explanation,
    source: insightsRes.source === "intent_engine" ? "intent_engine" : "fixture",
    status: decisionStatus,
  };
}
