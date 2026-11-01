import { NextRequest, NextResponse } from "next/server";
import { globalCreativesRepo } from "@/lib/repo";
import { getCampaignsCatalog, addCampaignToCatalog } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const creative = await globalCreativesRepo.get(id);

  if (!creative) {
    return NextResponse.json(
      { error: "not_found", message: `Creative with ID '${id}' not found` },
      { status: 404 }
    );
  }

  const updated = await globalCreativesRepo.updateStatus(id, "approved");

  // Check if body requested "useAsInScene"
  let bodyJson: Record<string, unknown> = {};
  try {
    bodyJson = await req.json();
  } catch {
    bodyJson = {};
  }

  if (bodyJson.useAsInScene && updated) {
    const catalog = getCampaignsCatalog();
    const camp = catalog.find((c) => c.id === updated.campaignId);
    if (camp) {
      camp.palette = updated.style.palette;
      camp.headline.en = updated.copy.headline;
      camp.cta.en = updated.copy.cta;
      addCampaignToCatalog(camp);
    }
  }

  return NextResponse.json({
    creative: updated,
    message: "Creative approved successfully",
  });
}
