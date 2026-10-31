import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ZoneSchema, RulesSchema, Viewer, CampaignSchema } from "@/lib/schema";
import { runDecisionPipeline } from "@/lib/decide";
import { getCampaignsCatalog } from "@/lib/store";
import viewersJson from "@/data/viewers.json";

const BatchDecideSchema = z.object({
  zone: ZoneSchema,
  rules: RulesSchema,
  campaigns: z.array(CampaignSchema).optional(),
});

export async function POST(req: NextRequest) {
  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_input", message: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const parseResult = BatchDecideSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "Payload validation failed",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { zone, rules, campaigns } = parseResult.data;
  const activeCampaigns = campaigns || getCampaignsCatalog();
  const viewers = viewersJson as Viewer[];

  try {
    const decisions = await Promise.all(
      viewers.map((viewer) =>
        runDecisionPipeline({
          zone,
          rules,
          viewer,
          campaigns: activeCampaigns,
        })
      )
    );

    return NextResponse.json({
      decisions,
      count: decisions.length,
    });
  } catch {
    return NextResponse.json(
      { error: "qloo_error", message: "Failed running batch decisions" },
      { status: 502 }
    );
  }
}
