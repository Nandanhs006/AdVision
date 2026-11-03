import { NextRequest, NextResponse } from "next/server";
import { getIntentClient } from "@/lib/intent/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term");

  if (!term || term.trim().length === 0) {
    return NextResponse.json(
      { error: "invalid_input", message: "Parameter 'term' is required" },
      { status: 400 }
    );
  }

  try {
    const client = getIntentClient();
    const result = await client.resolveTags(term.trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "intent_error", message: "Failed resolving intent tags" },
      { status: 502 }
    );
  }
}
