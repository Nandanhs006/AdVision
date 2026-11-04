import { NextRequest, NextResponse } from "next/server";
import { runSlotScout } from "@/lib/slotScout";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filmTitle = String(body.filmTitle || "The Neon Crossing");
    const currentSec = Number(body.currentSec || 2.0);
    const durationSec = Number(body.durationSec || 20);
    const frameImage = typeof body.frameImage === "string" ? body.frameImage : undefined;
    const clickPoint = body.clickPoint;

    const result = await runSlotScout({
      filmTitle,
      currentSec,
      durationSec,
      frameImage,
      clickPoint,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "scout_failed", message: "Failed scouting ad surfaces in footage" },
      { status: 500 }
    );
  }
}
