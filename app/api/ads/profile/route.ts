import { NextRequest, NextResponse } from "next/server";
import { CohortSchema } from "@/lib/schema";
import { buildTasteProfile } from "@/lib/ads/taste-profile";
import { checkRateLimit } from "@/lib/store";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed } = checkRateLimit(ip, 20);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Rate limit exceeded. Max 20 requests per minute." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = CohortSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "Invalid cohort payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const profile = await buildTasteProfile(parsed.data);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      {
        error: "qloo_error",
        message: err instanceof Error ? err.message : "Failed to generate taste profile",
      },
      { status: 500 }
    );
  }
}
