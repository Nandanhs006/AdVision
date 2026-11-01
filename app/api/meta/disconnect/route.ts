import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { globalConnectionsRepo } from "@/lib/repo";

const DisconnectSchema = z.object({
  connectionId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = DisconnectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: "Missing connectionId" },
        { status: 400 }
      );
    }

    const deleted = await globalConnectionsRepo.delete(parsed.data.connectionId);
    return NextResponse.json({
      success: deleted,
      message: deleted
        ? "Connection and stored tokens deleted completely"
        : "Connection not found",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "meta_error",
        message: err instanceof Error ? err.message : "Failed to disconnect",
      },
      { status: 500 }
    );
  }
}
