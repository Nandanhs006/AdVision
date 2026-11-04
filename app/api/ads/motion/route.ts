import { NextRequest, NextResponse } from "next/server";
import { generateMotionAdPlan } from "@/lib/ads/motion";
import { BriefSchema, CohortSchema, StyleSpecSchema } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId") || "camp-repbull-focus";
    const durationParam = searchParams.get("durationSec");
    const durationSec = durationParam ? parseFloat(durationParam) : 15.0;

    const brief = {
      brandName: campaignId.includes("sony")
        ? "Sony Alpha Optics"
        : campaignId.includes("kissa")
        ? "Kissa Craft Roasters"
        : "RepBull Energy",
      product: campaignId.includes("sony")
        ? "Alpha 7R V Full Frame"
        : campaignId.includes("kissa")
        ? "Shibuya Cold Drip Blend"
        : "Zero Sugar Ultra Focus",
      category: campaignId.includes("sony")
        ? "electronics"
        : campaignId.includes("kissa")
        ? "coffee"
        : "beverage",
      goal: "awareness" as const,
      languages: ["en"],
    };

    const cohort = {
      city: campaignId.includes("sony") ? "Tokyo" : "San Francisco",
      country: campaignId.includes("sony") ? "Japan" : "United States",
      language: "en",
      ageBand: "25-34",
      anchors: ["Formula 1", "Haruki Murakami", "Cinematography"],
      goal: "awareness" as const,
    };

    const styleSpec = {
      palette: { bg: "#0b0f19", fg: "#f1f5f9", accent: "#06b6d4" },
      typeStyle: "geometric-sans" as const,
      layout: "bold-type" as const,
      motif: "waves" as const,
      tone: ["bold", "kinetic", "high-energy"],
      energy: 0.9,
    };

    const plan = await generateMotionAdPlan({
      campaignId,
      brief,
      cohort,
      styleSpec,
      durationSec,
    });

    return NextResponse.json({
      success: true,
      plan,
      metaAIModel: "Meta Muse Spark + Muse Wonder",
      event: "Meta Global AI Developer Hackathon",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch motion ad plan" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaignId = body.campaignId || "default-campaign";
    const durationSec = typeof body.durationSec === "number" ? body.durationSec : 15.0;

    const brief = BriefSchema.parse(body.brief || {
      brandName: "RepBull Energy",
      product: "Zero Sugar Ultra Focus",
      category: "beverage",
      goal: "awareness",
      languages: ["en"],
    });

    const cohort = CohortSchema.parse(body.cohort || {
      city: "Tokyo",
      country: "Japan",
      language: "en",
      ageBand: "25-34",
      anchors: ["Formula 1", "Haruki Murakami", "Shibuya Nightlife"],
      goal: "awareness",
    });

    const styleSpec = StyleSpecSchema.parse(body.styleSpec || {
      palette: { bg: "#0b0f19", fg: "#f1f5f9", accent: "#06b6d4" },
      typeStyle: "geometric-sans",
      layout: "bold-type",
      motif: "waves",
      tone: ["bold", "kinetic", "high-energy"],
      energy: 0.9,
    });

    const plan = await generateMotionAdPlan({
      campaignId,
      brief,
      cohort,
      styleSpec,
      durationSec,
    });

    return NextResponse.json({
      success: true,
      plan,
      metaAIModel: "Meta Muse Spark + Muse Wonder",
      event: "Meta Global AI Developer Hackathon",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to generate motion ad plan" },
      { status: 400 }
    );
  }
}
