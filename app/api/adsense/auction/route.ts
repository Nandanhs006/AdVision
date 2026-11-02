import { NextRequest, NextResponse } from "next/server";
import { getAdSenseProvider, AdSenseBidRequest } from "@/lib/adsense";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AdSenseBidRequest;
    if (!body.zoneId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: zoneId" },
        { status: 400 }
      );
    }

    const provider = getAdSenseProvider();
    const result = await provider.runAuction(body);

    return NextResponse.json({
      success: true,
      auction: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to run AdSense auction",
      },
      { status: 500 }
    );
  }
}
