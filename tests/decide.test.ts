import { describe, it, expect, beforeEach } from "vitest";
import { runDecisionPipeline } from "../lib/decide";
import { QlooClient } from "../lib/qloo/client";
import { Zone, Rules, Viewer, Campaign } from "../lib/schema";
import viewersJson from "../data/viewers.json";
import campaignsJson from "../data/campaigns.json";

describe("Decision Engine & Rules Filter", () => {
  let mockZone: Zone;
  let mockRules: Rules;
  const viewers = viewersJson as Viewer[];
  const campaigns = campaignsJson as Campaign[];
  let client: QlooClient;

  beforeEach(() => {
    client = new QlooClient({ mode: "fixture" });
    mockZone = {
      id: "zone-billboard",
      label: "Rooftop Billboard",
      quad: [
        { x: 0.2, y: 0.2 },
        { x: 0.5, y: 0.2 },
        { x: 0.5, y: 0.5 },
        { x: 0.2, y: 0.5 },
      ],
      startSec: 1.0,
      endSec: 10.0,
      frameShare: 0.09,
    };
    mockRules = {
      allowedCategories: [],
      blockedCategories: ["spirits"],
      prominenceCap: 0.25,
      requireApproval: false,
      sceneMood: ["neon", "night", "cyberpunk"],
    };
  });

  it("should bypass Qloo and return neutral for ad-free subscribers", async () => {
    const adfreeViewer = viewers.find((v) => v.adPreference === "adfree")!;
    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: mockRules,
      viewer: adfreeViewer,
      campaigns,
      qlooClient: client,
    });

    expect(decision.winner).toBe("neutral");
    expect(decision.ranked.length).toBe(0);
    expect(decision.trace.length).toBe(0);
    expect(decision.reasons[0]).toContain("ad-free");
  });

  it("should bypass Qloo and select only public service for kids profile", async () => {
    const kidsViewer = viewers.find((v) => v.adPreference === "kids")!;
    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: mockRules,
      viewer: kidsViewer,
      campaigns,
      qlooClient: client,
    });

    expect(decision.winner).not.toBe("neutral");
    expect(decision.winningCampaign?.publicService).toBe(true);
    expect(decision.trace.length).toBe(0);
    expect(decision.reasons[0]).toContain("kids");
  });

  it("should never let a blocked category win, even with highest taste affinity", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    // Explicitly block coffee (which has 94% affinity in Tokyo)
    const strictRules: Rules = {
      ...mockRules,
      blockedCategories: ["coffee", "spirits"],
    };

    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: strictRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    expect(decision.winner).not.toBe("camp-kissa-coffee");
    const coffeeRank = decision.ranked.find((r) => r.category === "coffee");
    expect(coffeeRank?.status).toBe("blocked");
    expect(coffeeRank?.reason).toContain("explicitly blocked");
  });

  it("should enforce allowed categories whitelist", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const whitelistRules: Rules = {
      ...mockRules,
      allowedCategories: ["books"],
    };

    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: whitelistRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    expect(decision.winner).toBe("camp-atlantis-books");
    const coffeeRank = decision.ranked.find((r) => r.campaignId === "camp-kissa-coffee");
    expect(coffeeRank?.status).toBe("blocked");
  });

  it("should cap campaigns when zone frameShare exceeds prominenceCap", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const oversizedZone: Zone = {
      ...mockZone,
      frameShare: 0.35, // 35% of screen
    };
    const tightRules: Rules = {
      ...mockRules,
      blockedCategories: [], // No blocked categories so we test cap directly
      prominenceCap: 0.15,   // Cap is 15%
    };

    const decision = await runDecisionPipeline({
      zone: oversizedZone,
      rules: tightRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    const activeCampaigns = decision.ranked.filter((r) => r.status !== "expired");
    expect(activeCampaigns.length).toBeGreaterThan(0);
    activeCampaigns.forEach((r) => {
      expect(r.status).toBe("capped");
    });
    // Fallback to PSA or neutral
    expect(decision.winningCampaign?.publicService || decision.winner === "neutral").toBe(true);
  });

  it("should mark expired flights as expired", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: mockRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
      now: "2026-10-31",
    });

    const expiredCamp = decision.ranked.find((r) => r.campaignId === "camp-vintage-archive");
    expect(expiredCamp?.status).toBe("expired");
    expect(expiredCamp?.reason).toContain("ended on 2024-01-01");
  });

  it("should assign tag-overlap fallback capped at 0.5 for non-top brands", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: mockRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    const fallbackCandidate = decision.ranked.find((r) => r.status === "not_in_qloo_top");
    if (fallbackCandidate) {
      expect(fallbackCandidate.qlooAffinity).toBeLessThanOrEqual(0.5);
    }
  });

  it("should hold decision as pending when requireApproval is enabled", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const approvalRules: Rules = {
      ...mockRules,
      requireApproval: true,
    };

    const decision = await runDecisionPipeline({
      zone: mockZone,
      rules: approvalRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    expect(decision.status).toBe("pending");
    expect(decision.reasons.some((r) => r.includes("pending approval"))).toBe(true);
  });

  it("should be strictly deterministic across repeated runs", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const run1 = await runDecisionPipeline({
      zone: mockZone,
      rules: mockRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    const run2 = await runDecisionPipeline({
      zone: mockZone,
      rules: mockRules,
      viewer: tokyoViewer,
      campaigns,
      qlooClient: client,
    });

    expect(run1.winner).toBe(run2.winner);
    expect(run1.ranked.length).toBe(run2.ranked.length);
    expect(run1.ranked[0].finalScore).toBe(run2.ranked[0].finalScore);
  });
});
