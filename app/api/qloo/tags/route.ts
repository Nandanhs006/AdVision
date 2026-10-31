import { NextRequest, NextResponse } from "next/server";
import { getQlooClient } from "@/lib/qloo/client";

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
    const qloo = getQlooClient();
    const result = await qloo.resolveTags(term.trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "qloo_error", message: "Failed querying Qloo tags" },
      { status: 502 }
    );
  }
}
