import { describe, it, expect, beforeEach } from "vitest";
import { DecisionAgent } from "../lib/agent";
import { QlooClient } from "../lib/qloo/client";
import { Zone, Rules, Viewer, Campaign } from "../lib/schema";
import viewersJson from "../data/viewers.json";
import campaignsJson from "../data/campaigns.json";

describe("DecisionAgent", () => {
  let client: QlooClient;
  let agent: DecisionAgent;
  const viewers = viewersJson as Viewer[];
  const campaigns = campaignsJson as Campaign[];

  const zone: Zone = {
    id: "zone-1",
    label: "Billboard",
    quad: [
      { x: 0.1, y: 0.1 },
      { x: 0.4, y: 0.1 },
      { x: 0.4, y: 0.4 },
      { x: 0.1, y: 0.4 },
    ],
    startSec: 0,
    endSec: 10,
    frameShare: 0.09,
  };

  const rules: Rules = {
    allowedCategories: [],
    blockedCategories: ["spirits"],
    prominenceCap: 0.35,
    requireApproval: false,
    sceneMood: ["neon"],
  };

  beforeEach(() => {
    client = new QlooClient({ mode: "fixture" });
    agent = new DecisionAgent({ qlooClient: client });
  });

  it("should gracefully run decision pipeline when no Groq key is set", async () => {
    const tokyoViewer = viewers.find((v) => v.id === "viewer-tokyo")!;
    const decision = await agent.decide({
      zone,
      rules,
      viewer: tokyoViewer,
      campaigns,
    });

    expect(decision.winner).toBe("camp-kissa-coffee");
    expect(decision.ranked.length).toBeGreaterThan(0);
    expect(decision.explanation).toContain("Kissa Craft Roasters");
  });

  it("should bypass LLM completely for kids and ad-free tiers", async () => {
    const kidsViewer = viewers.find((v) => v.adPreference === "kids")!;
    const decision = await agent.decide({
      zone,
      rules,
      viewer: kidsViewer,
      campaigns,
    });

    expect(decision.winningCampaign?.publicService).toBe(true);

    const adfreeViewer = viewers.find((v) => v.adPreference === "adfree")!;
    const adfreeDecision = await agent.decide({
      zone,
      rules,
      viewer: adfreeViewer,
      campaigns,
    });
    expect(adfreeDecision.winner).toBe("neutral");
  });
});
