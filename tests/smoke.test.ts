import { describe, it, expect } from "vitest";
import { POST as generateRoute } from "../app/api/ads/generate/route";
import { POST as approveRoute } from "../app/api/ads/[id]/approve/route";
import { POST as publishRoute } from "../app/api/ads/publish/route";
import { GET as connectionsRoute } from "../app/api/connections/route";
import { GET as analyticsRoute } from "../app/api/ads/analytics/route";
import { getCampaignsCatalog } from "../lib/store";
import { NextRequest } from "next/server";

function createJsonRequest(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.88",
    },
    body: JSON.stringify(body),
  });
}

describe("Ad Studio: End-to-End Simulated Smoke Test", () => {
  const brief = {
    brandName: "RepBull Energy",
    product: "RepBull Zero",
    category: "beverage",
    goal: "awareness" as const,
    languages: ["en"],
    paletteOverride: { bg: "#001a30", fg: "#ffffff", accent: "#ffd600" },
  };

  const cohort = {
    city: "New York",
    country: "United States",
    language: "en",
    ageBand: "21-30",
    anchors: ["Tyler The Creator", "Formula 1", "Dumbo Brooklyn"],
    goal: "awareness" as const,
  };

  it("should execute the complete Ad Studio flow: brief -> cohort -> generate -> approve -> simulated publish", async () => {
    // 1. Generate Creatives (Brief + Cohort)
    const genReq = createJsonRequest("http://localhost:3000/api/ads/generate", "POST", {
      brief,
      cohort,
    });
    const genRes = await generateRoute(genReq);
    expect(genRes.status).toBe(200);

    const genData = await genRes.json();
    expect(genData.campaignId).toBeDefined();
    expect(genData.creatives).toHaveLength(9); // 3 variants * 3 aspects
    expect(genData.tasteProfile.topTags.length).toBeGreaterThan(0);

    const primarySquareCreative = genData.creatives.find(
      (c: any) => c.variant === "primary" && c.aspect === "1:1"
    );
    expect(primarySquareCreative).toBeDefined();
    expect(primarySquareCreative.status).toBe("draft");

    // 2. Approve Creative and Link to Part 1 In-Scene Billboard
    const approveReq = createJsonRequest(
      `http://localhost:3000/api/ads/${primarySquareCreative.id}/approve`,
      "POST",
      { useAsInScene: true }
    );
    const approveRes = await approveRoute(approveReq, {
      params: Promise.resolve({ id: primarySquareCreative.id }),
    });
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.creative.status).toBe("approved");

    // Verify campaign in catalog now reflects the approved creative palette & headline
    const catalog = getCampaignsCatalog();
    const camp = catalog.find((c) => c.id === genData.campaignId);
    expect(camp).toBeDefined();
    expect(camp?.palette).toEqual(primarySquareCreative.style.palette);

    // 3. Check Connected Social Target
    const connRes = await connectionsRoute();
    expect(connRes.status).toBe(200);
    const connData = await connRes.json();
    expect(connData.connections.length).toBeGreaterThan(0);

    const simConnection = connData.connections.find((c: any) => c.mode === "simulated");
    expect(simConnection).toBeDefined();
    expect(simConnection.targets.length).toBeGreaterThan(0);

    // 4. Simulated Publish
    const pubReq = createJsonRequest("http://localhost:3000/api/ads/publish", "POST", {
      creativeId: primarySquareCreative.id,
      connectionId: simConnection.id,
      targetId: simConnection.targets[0].id,
    });
    const pubRes = await publishRoute(pubReq);
    expect(pubRes.status).toBe(200);
    const pubData = await pubRes.json();

    // Verification of Honesty Constraint: Simulated must be true and never presented as live
    expect(pubData.result.success).toBe(true);
    expect(pubData.result.simulated).toBe(true);
    expect(pubData.result.status).toBe("simulated");
    expect(pubData.result.externalPostId).toMatch(/^sim_/);
    expect(pubData.job.status).toBe("simulated");

    // 5. Verify Analytics Reflects Ad Studio Production Activity
    const analyticsRes = await analyticsRoute();
    expect(analyticsRes.status).toBe(200);
    const analyticsData = await analyticsRes.json();
    expect(analyticsData.totalGenerated).toBeGreaterThanOrEqual(9);
    expect(analyticsData.totalApproved).toBeGreaterThanOrEqual(1);
    expect(analyticsData.totalPublishedSimulated).toBeGreaterThanOrEqual(1);
  });
});
