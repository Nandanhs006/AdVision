import { NextRequest, NextResponse } from "next/server";
import { getIntentClient } from "@/lib/intent/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const types = searchParams.get("types")?.split(",");
  const take = Number(searchParams.get("take") || "5");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "invalid_input", message: "Parameter 'query' is required" },
      { status: 400 }
    );
  }

  try {
    const client = getIntentClient();
    const result = await client.search(query.trim(), types, take);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "intent_error", message: "Failed querying intent search" },
      { status: 502 }
    );
  }
}
