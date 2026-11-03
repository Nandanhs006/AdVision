import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ZoneSchema, RulesSchema, ViewerSchema, CampaignSchema } from "@/lib/schema";
import { DecisionAgent } from "@/lib/agent";
import { checkRateLimit, getCampaignsCatalog } from "@/lib/store";

const DecideBodySchema = z.object({
  zone: ZoneSchema,
  rules: RulesSchema,
  viewer: ViewerSchema,
  campaigns: z.array(CampaignSchema).optional(),
});

export async function POST(req: NextRequest) {
  // Rate-limiting by IP (10 req/min)
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed } = checkRateLimit(ip.split(",")[0].trim());
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Rate limit is 10 requests per minute." },
      { status: 429 }
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_input", message: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const parseResult = DecideBodySchema.safeParse(bodyJson);
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

  const { zone, rules, viewer, campaigns } = parseResult.data;
  const activeCampaigns = campaigns || getCampaignsCatalog();

  try {
    const agent = new DecisionAgent();
    const decision = await agent.decide({
      zone,
      rules,
      viewer,
      campaigns: activeCampaigns,
    });

    return NextResponse.json(decision);
  } catch {
    return NextResponse.json(
      { error: "decision_error", message: "Decision pipeline failed while querying intent intelligence" },
      { status: 502 }
    );
  }
}
