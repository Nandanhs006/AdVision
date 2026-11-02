import { NextRequest, NextResponse } from "next/server";
import { getAdSenseProvider } from "@/lib/adsense";

export async function POST(req: NextRequest) {
  try {
    const { publisherId } = (await req.json()) as { publisherId?: string };
    const pid = publisherId || "pub-9482-1048-2847";

    const provider = getAdSenseProvider();
    const account = await provider.connect(pid);

    return NextResponse.json({
      success: true,
      account,
      message: `Google AdSense Publisher ${pid} connected successfully.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect AdSense",
      },
      { status: 500 }
    );
  }
}
