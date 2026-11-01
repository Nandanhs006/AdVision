import { NextResponse } from "next/server";
import { globalConnectionsRepo } from "@/lib/repo";
import { getSocialProvider, PublishTarget } from "@/lib/meta";

export async function GET() {
  try {
    const connections = await globalConnectionsRepo.list();

    const sanitized = await Promise.all(
      connections.map(async (conn) => {
        let targets: PublishTarget[] = [];
        try {
          const provider = getSocialProvider(conn.mode);
          targets = await provider.listTargets(conn);
        } catch {
          targets = [];
        }

        return {
          id: conn.id,
          provider: conn.provider,
          mode: conn.mode,
          displayName: conn.displayName,
          externalId: conn.externalId,
          scopes: conn.scopes,
          expiresAt: conn.expiresAt,
          createdAt: conn.createdAt,
          targets,
        };
      })
    );

    return NextResponse.json({ connections: sanitized });
  } catch (err) {
    return NextResponse.json(
      {
        error: "server_error",
        message: err instanceof Error ? err.message : "Failed to load connections",
      },
      { status: 500 }
    );
  }
}
