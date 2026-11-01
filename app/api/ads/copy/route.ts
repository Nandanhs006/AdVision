import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BriefSchema } from "@/lib/schema";
import { generateAdCopy } from "@/lib/ads/copy";
import { checkRateLimit } from "@/lib/store";

const CopyRequestSchema = z.object({
  brief: BriefSchema,
  tone: z.array(z.string()).default(["modern", "authentic"]),
  language: z.string().default("en"),
  goal: z.enum(["awareness", "traffic", "sales"]).default("awareness"),
  platform: z.enum(["instagram", "facebook"]).optional().default("instagram"),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed } = checkRateLimit(ip, 15);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Rate limit exceeded. Max 15 copy requests per minute." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = CopyRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "Invalid copy request parameters",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { brief, tone, language, goal, platform } = parsed.data;
    const result = await generateAdCopy({
      brief,
      tone,
      language,
      goal,
      platform,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: "llm_error",
        message: err instanceof Error ? err.message : "Failed to generate copy",
      },
      { status: 500 }
    );
  }
}
