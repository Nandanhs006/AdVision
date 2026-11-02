import { NextResponse } from "next/server";
import { getAdSenseProvider } from "@/lib/adsense";

export async function GET() {
  try {
    const provider = getAdSenseProvider();
    const [account, units] = await Promise.all([
      provider.getAccount(),
      provider.listAdUnits(),
    ]);

    return NextResponse.json({
      success: true,
      account,
      units,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch AdSense inventory",
      },
      { status: 500 }
    );
  }
}
