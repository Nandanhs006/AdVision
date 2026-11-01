import { NextRequest, NextResponse } from "next/server";
import { globalCreativesRepo } from "@/lib/repo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const creative = await globalCreativesRepo.get(id);

  if (!creative) {
    return NextResponse.json(
      { error: "not_found", message: `Ad creative with ID '${id}' not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({ creative });
}
