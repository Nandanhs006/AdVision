import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSocialProvider } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerType = searchParams.get("provider") === "facebook" ? "facebook" : "instagram";
  const mode = searchParams.get("mode") === "live" ? "live" : undefined;

  const state = crypto.randomBytes(16).toString("hex");
  const provider = getSocialProvider(mode);
  const connectUrl = await provider.connectUrl(providerType, state);

  // If redirect query param is set, redirect; else return JSON
  if (searchParams.get("redirect") === "true") {
    return NextResponse.redirect(connectUrl);
  }

  return NextResponse.json({ connectUrl, state, provider: providerType });
}
