import { NextResponse } from "next/server";
import {
  globalCreativesRepo,
  globalPublishJobsRepo,
  globalCohortsRepo,
} from "@/lib/repo";

export async function GET() {
  try {
    const [creatives, jobs, cohorts] = await Promise.all([
      globalCreativesRepo.list(),
      globalPublishJobsRepo.list(),
      globalCohortsRepo.list(),
    ]);

    const totalGenerated = creatives.length;
    const totalApproved = creatives.filter((c) => c.status === "approved").length;

    const liveJobs = jobs.filter((j) => !j.simulated && j.status === "published");
    const simulatedJobs = jobs.filter(
      (j) => j.simulated || j.status === "simulated"
    );

    // Grouping by Cohort
    const cohortStats = cohorts.map((co) => {
      const coCreatives = creatives.filter((c) => c.cohortId === co.id);
      const coCreativeIds = new Set(coCreatives.map((c) => c.id));
      const coJobs = jobs.filter((j) => coCreativeIds.has(j.creativeId));

      return {
        cohortId: co.id,
        location: `${co.city}, ${co.country}`,
        language: co.language.toUpperCase(),
        ageBand: co.ageBand,
        generated: coCreatives.length,
        approved: coCreatives.filter((c) => c.status === "approved").length,
        publishedLive: coJobs.filter((j) => !j.simulated && j.status === "published").length,
        publishedSimulated: coJobs.filter((j) => j.simulated || j.status === "simulated").length,
      };
    });

    return NextResponse.json({
      totalGenerated,
      totalApproved,
      totalPublishedLive: liveJobs.length,
      totalPublishedSimulated: simulatedJobs.length,
      cohorts: cohortStats,
      recentJobs: jobs.slice(0, 10),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "server_error",
        message: err instanceof Error ? err.message : "Failed to load analytics",
      },
      { status: 500 }
    );
  }
}
