import { NextRequest, NextResponse } from "next/server";
import { getSocialProvider } from "@/lib/meta";
import { globalConnectionsRepo } from "@/lib/repo";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  const providerType =
    searchParams.get("provider") === "facebook" ? "facebook" : "instagram";
  const error = searchParams.get("error_description") || searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/connections?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/connections?error=${encodeURIComponent("Missing authorization code")}`
    );
  }

  try {
    // If code starts with "sim_", use simulated provider; else check environment
    const isSimulated = code.startsWith("sim_") || process.env.META_MODE !== "live";
    const provider = getSocialProvider(isSimulated ? "simulated" : "live");

    const connection = await provider.handleCallback(code, state, providerType);
    await globalConnectionsRepo.upsert(connection);

    return NextResponse.redirect(`${origin}/connections?connected=true`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth connection failed";
    return NextResponse.redirect(
      `${origin}/connections?error=${encodeURIComponent(msg)}`
    );
  }
}
