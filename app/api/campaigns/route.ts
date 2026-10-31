import { NextRequest, NextResponse } from "next/server";
import { CampaignSchema } from "@/lib/schema";
import { getCampaignsCatalog, addCampaignToCatalog } from "@/lib/store";

export async function GET() {
  const campaigns = getCampaignsCatalog();
  return NextResponse.json({
    campaigns,
    count: campaigns.length,
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

  const parseResult = CampaignSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "Invalid campaign schema",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const campaign = parseResult.data;
  addCampaignToCatalog(campaign);

  return NextResponse.json({
    success: true,
    campaign,
  });
}
