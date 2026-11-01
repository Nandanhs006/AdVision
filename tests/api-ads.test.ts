import { describe, it, expect } from "vitest";
import { POST as profileRoute } from "../app/api/ads/profile/route";
import { POST as generateRoute } from "../app/api/ads/generate/route";
import { POST as copyRoute } from "../app/api/ads/copy/route";
import { GET as getCreativeRoute } from "../app/api/ads/[id]/route";
import { POST as approveCreativeRoute } from "../app/api/ads/[id]/approve/route";
import { POST as publishRoute } from "../app/api/ads/publish/route";
import { GET as connectionsRoute } from "../app/api/connections/route";
import { POST as disconnectRoute } from "../app/api/meta/disconnect/route";
import { POST as mcpRoute } from "../app/api/mcp/route";
import { NextRequest } from "next/server";

function createRequest(url: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Ad Studio: API Routes & MCP Integration", () => {
  const validCohort = {
    city: "Tokyo",
    country: "Japan",
    language: "ja",
    ageBand: "25-34",
    anchors: ["Haruki Murakami", "Ryuichi Sakamoto", "Daikanyama T-Site"],
    goal: "awareness",
  };

  const validBrief = {
    brandName: "RepBull Energy",
    product: "RepBull Zero",
    category: "beverage",
    goal: "awareness",
    languages: ["ja"],
  };

  it("POST /api/ads/profile should generate taste profile or return 400 on invalid input", async () => {
    // Valid call
    const req = createRequest("http://localhost:3000/api/ads/profile", "POST", validCohort);
    const res = await profileRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile).toBeDefined();
    expect(data.profile.topTags.length).toBeGreaterThan(0);

    // Invalid call (missing anchors)
    const badReq = createRequest("http://localhost:3000/api/ads/profile", "POST", { city: "Tokyo" });
    const badRes = await profileRoute(badReq);
    expect(badRes.status).toBe(400);
    const badData = await badRes.json();
    expect(badData.error).toBe("invalid_input");
  });

  it("POST /api/ads/copy should return strictly validated ad copy", async () => {
    const req = createRequest("http://localhost:3000/api/ads/copy", "POST", {
      brief: validBrief,
      tone: ["bold", "energetic"],
      language: "en",
      goal: "awareness",
    });
    const res = await copyRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.copy).toBeDefined();
    expect(data.copy.headline).toBeTruthy();
    expect(data.copy.cta).toBeTruthy();
  });

  it("POST /api/ads/generate should create creatives across all variants and aspects", async () => {
    const req = createRequest("http://localhost:3000/api/ads/generate", "POST", {
      brief: validBrief,
      cohort: validCohort,
    });
    const res = await generateRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.campaignId).toBeDefined();
    expect(data.tasteProfile).toBeDefined();
    // 3 variants (primary, contrast, safe) * 3 aspects (1:1, 4:5, 9:16) = 9 creatives
    expect(data.creatives).toHaveLength(9);
    expect(data.creatives[0].imageUrl).toContain(".png");
  });

  it("GET and POST /api/ads/[id] and /approve should fetch and approve creative", async () => {
    // First generate to populate
    const genReq = createRequest("http://localhost:3000/api/ads/generate", "POST", {
      brief: validBrief,
      cohort: validCohort,
    });
    const genRes = await generateRoute(genReq);
    const genData = await genRes.json();
    const creativeId = genData.creatives[0].id;

    // GET /api/ads/[id]
    const getRes = await getCreativeRoute(
      createRequest(`http://localhost:3000/api/ads/${creativeId}`),
      { params: Promise.resolve({ id: creativeId }) }
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.creative.id).toBe(creativeId);

    // POST /api/ads/[id]/approve
    const approveRes = await approveCreativeRoute(
      createRequest(`http://localhost:3000/api/ads/${creativeId}/approve`, "POST", {
        useAsInScene: true,
      }),
      { params: Promise.resolve({ id: creativeId }) }
    );
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.creative.status).toBe("approved");
  });

  it("POST /api/ads/publish should publish creative to connected provider", async () => {
    // Generate creative first
    const genReq = createRequest("http://localhost:3000/api/ads/generate", "POST", {
      brief: validBrief,
      cohort: validCohort,
    });
    const genRes = await generateRoute(genReq);
    const genData = await genRes.json();
    const creativeId = genData.creatives[0].id;

    // Publish to simulated connection
    const pubReq = createRequest("http://localhost:3000/api/ads/publish", "POST", {
      creativeId,
      connectionId: "conn-sim-fb-01",
    });
    const pubRes = await publishRoute(pubReq);
    expect(pubRes.status).toBe(200);
    const pubData = await pubRes.json();
    expect(pubData.job).toBeDefined();
    expect(pubData.result.simulated).toBe(true);
    expect(pubData.result.status).toBe("simulated");
  });

  it("GET /api/connections and POST /api/meta/disconnect should list and delete", async () => {
    // List connections (tokens must be redacted / not exposed)
    const listRes = await connectionsRoute();
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.connections.length).toBeGreaterThan(0);
    expect(listData.connections[0].tokenEnc).toBeUndefined();

    // Disconnect
    const disconnReq = createRequest("http://localhost:3000/api/meta/disconnect", "POST", {
      connectionId: "conn-sim-fb-01",
    });
    const disconnRes = await disconnectRoute(disconnReq);
    expect(disconnRes.status).toBe(200);
    const disconnData = await disconnRes.json();
    expect(disconnData.success).toBe(true);
  });

  it("POST /api/mcp should handle ads_taste_profile and ads_generate_variants", async () => {
    // Call ads_taste_profile
    const mcpProfileReq = createRequest("http://localhost:3000/api/mcp", "POST", {
      method: "tools/call",
      params: {
        name: "ads_taste_profile",
        arguments: {
          city: "Tokyo",
          country: "Japan",
          anchors: ["Haruki Murakami", "Ryuichi Sakamoto", "Daikanyama T-Site"],
        },
      },
    });
    const mcpProfileRes = await mcpRoute(mcpProfileReq);
    expect(mcpProfileRes.status).toBe(200);
    const mcpProfileData = await mcpProfileRes.json();
    expect(mcpProfileData.result.content[0].text).toContain("topTags");

    // Call ads_generate_variants
    const mcpGenReq = createRequest("http://localhost:3000/api/mcp", "POST", {
      method: "tools/call",
      params: {
        name: "ads_generate_variants",
        arguments: {
          brandName: "RepBull Energy",
          product: "RepBull Zero",
          category: "beverage",
          city: "Tokyo",
          country: "Japan",
          anchors: ["Haruki Murakami", "Ryuichi Sakamoto", "Daikanyama T-Site"],
        },
      },
    });
    const mcpGenRes = await mcpRoute(mcpGenReq);
    expect(mcpGenRes.status).toBe(200);
    const mcpGenData = await mcpGenRes.json();
    expect(mcpGenData.result.content[0].text).toContain("variants");
  });
});
