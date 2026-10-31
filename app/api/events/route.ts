import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAdEvent, getAdEvents } from "@/lib/store";

const EventPostSchema = z.object({
  type: z.enum(["impression", "pause_view", "click"]),
  campaignId: z.string(),
  viewerId: z.string(),
  zoneId: z.string(),
  city: z.string(),
});

export async function GET() {
  const events = getAdEvents();
  return NextResponse.json({
    events,
    count: events.length,
  });
}

export async function POST(req: NextRequest) {
  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_input", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parseResult = EventPostSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "Invalid event data",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const created = logAdEvent(parseResult.data);
  return NextResponse.json({
    success: true,
    event: created,
  });
}
