import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  globalCreativesRepo,
  globalConnectionsRepo,
  globalPublishJobsRepo,
} from "@/lib/repo";
import { getSocialProvider } from "@/lib/meta";
import { PublishJob } from "@/lib/schema";
import { checkRateLimit } from "@/lib/store";

const PublishRequestSchema = z.object({
  creativeId: z.string(),
  connectionId: z.string(),
  targetId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed } = checkRateLimit(ip, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Rate limit exceeded. Max 10 publish requests per minute." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = PublishRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "Invalid publish request parameters",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { creativeId, connectionId, targetId } = parsed.data;

    // 1. Fetch Creative
    const creative = await globalCreativesRepo.get(creativeId);
    if (!creative) {
      return NextResponse.json(
        { error: "not_found", message: `Creative '${creativeId}' not found` },
        { status: 404 }
      );
    }

    // 2. Fetch Connection
    const connection = await globalConnectionsRepo.get(connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: "not_found", message: `Connection '${connectionId}' not found` },
        { status: 404 }
      );
    }

    // 3. Determine Provider and Targets
    const provider = getSocialProvider(connection.mode);
    const targets = await provider.listTargets(connection);
    const target =
      (targetId ? targets.find((t) => t.id === targetId) : targets[0]) || {
        id: "default-target",
        name: connection.displayName,
        provider: connection.provider,
        isSimulated: connection.mode === "simulated",
      };

    // 4. Create Queued Publish Job
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: PublishJob = {
      id: jobId,
      creativeId,
      connectionId,
      provider: connection.provider,
      status: "queued",
      simulated: connection.mode === "simulated",
      createdAt: new Date().toISOString(),
    };
    await globalPublishJobsRepo.create(job);

    // 5. Execute Publish
    const result = await provider.publish(creative, target, connection);

    // 6. Update Job Record
    const updatedJob = await globalPublishJobsRepo.update(jobId, {
      status: result.status,
      externalPostId: result.externalPostId,
      error: result.error,
      completedAt: new Date().toISOString(),
    });

    // 7. Update Creative Status
    if (result.success) {
      await globalCreativesRepo.updateStatus(
        creativeId,
        result.simulated ? "simulated" : "published"
      );
    } else {
      await globalCreativesRepo.updateStatus(creativeId, "failed");
    }

    return NextResponse.json({
      job: updatedJob,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "meta_error",
        message: err instanceof Error ? err.message : "Publishing failed",
      },
      { status: 500 }
    );
  }
}
