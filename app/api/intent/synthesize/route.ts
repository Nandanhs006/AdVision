import { NextRequest, NextResponse } from "next/server";
import { getMetaAIClient } from "@/lib/ai/meta-client";
import { getCampaignsCatalog } from "@/lib/store";
import { RankedCampaign } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "empty_prompt", message: "Intent prompt cannot be empty" },
        { status: 400 }
      );
    }

    const sceneContext = body.sceneContext;
    const metaClient = getMetaAIClient();

    // 1. Synthesize intent using Meta Llama 3.3 / Meta Model API
    const synthesis = await metaClient.synthesizeIntentTargeting({
      prompt,
      sceneContext,
    });

    // 2. Load active campaigns catalog
    const campaigns = getCampaignsCatalog();
    const winningCampaign = campaigns.find((c) => c.id === synthesis.matchedCampaignId) || campaigns[0];

    // 3. Compute dynamic ranking based on Meta AI intent synthesis
    const rankedCampaigns: RankedCampaign[] = campaigns.map((c) => {
      let score = 0.50;
      let status: "selected" | "allowed" | "blocked" | "capped" | "expired" = "allowed";
      let reason = `Evaluated against intent profile '${synthesis.dominantCategory}'.`;

      if (c.id === winningCampaign.id) {
        score = synthesis.receptivityIndex / 100;
        status = "selected";
        reason = `Top affinity match (${Math.round(score * 100)}%) for prompt: "${prompt}". Urgency: ${synthesis.purchasingUrgency}.`;
      } else if (c.category === synthesis.dominantCategory) {
        score = Number((synthesis.receptivityIndex / 100 - 0.08).toFixed(2));
        reason = `Matches primary category '${c.category}'. Alternate candidate.`;
      } else {
        score = Math.max(0.20, Number((0.65 - Math.random() * 0.25).toFixed(2)));
      }

      return {
        campaignId: c.id,
        brandName: c.brandName,
        category: c.category,
        qlooAffinity: score,
        intentScore: score,
        status,
        reason,
      };
    });

    // Sort descending by score
    rankedCampaigns.sort((a, b) => (b.intentScore ?? 0) - (a.intentScore ?? 0));

    return NextResponse.json({
      synthesis,
      winningCampaign,
      ranked: rankedCampaigns,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "synthesis_error", message: err?.message || "Failed synthesizing intent targeting" },
      { status: 500 }
    );
  }
}
