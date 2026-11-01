import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BriefSchema,
  CohortSchema,
  AdCreative,
  AdAspect,
  AdVariant,
  Campaign,
} from "@/lib/schema";
import { buildTasteProfile } from "@/lib/ads/taste-profile";
import { mapTasteToStyle } from "@/lib/ads/taste-to-style";
import { generateAdCopy } from "@/lib/ads/copy";
import { renderCreativeToPng } from "@/lib/ads/render";
import {
  defaultImageStore,
  globalCreativesRepo,
  globalCohortsRepo,
} from "@/lib/repo";
import { checkRateLimit, addCampaignToCatalog, getCampaignsCatalog } from "@/lib/store";

const GenerateRequestSchema = z.object({
  brief: BriefSchema,
  cohort: CohortSchema,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed } = checkRateLimit(ip, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Rate limit exceeded. Max 10 generation requests per minute." },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = GenerateRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "Invalid brief or cohort payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { brief, cohort } = parsed.data;

    // 1. Persist Cohort
    const savedCohort = await globalCohortsRepo.upsert(cohort);
    const cohortId = savedCohort.id!;

    // 2. Generate Taste Profile
    const tasteProfile = await buildTasteProfile(cohort, {
      keywords: [brief.category, brief.product],
    });

    // 3. Map Taste to Styles (primary, contrast, safe)
    const styleOutput = mapTasteToStyle(
      tasteProfile,
      cohortId,
      brief.paletteOverride
    );

    // 4. Create or Resolve Shared Campaign Model
    const slug = brief.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const campaignId = `camp-${slug}-${Date.now().toString().slice(-4)}`;

    const existingCatalog = getCampaignsCatalog();
    let campaign = existingCatalog.find(
      (c) => c.brandName.toLowerCase() === brief.brandName.toLowerCase()
    );

    if (!campaign) {
      campaign = {
        id: campaignId,
        brandName: brief.brandName,
        category: brief.category,
        tags: tasteProfile.topTags.map((t) => t.name),
        languages: brief.languages,
        flight: {
          start: new Date().toISOString().split("T")[0],
          end: new Date(Date.now() + 30 * 86400 * 1000).toISOString().split("T")[0],
        },
        headline: {
          en: brief.product,
          [cohort.language]: brief.product,
        },
        cta: {
          en: "Explore",
          [cohort.language]: "Explore",
        },
        palette: styleOutput.primary.style.palette,
        publicService: false,
        adCreativeIds: [],
        createdInAdStudio: true,
      };
      addCampaignToCatalog(campaign);
    }

    // 5. Generate Copy for Variants in Parallel
    const [primaryCopyRes, contrastCopyRes, safeCopyRes] = await Promise.all([
      generateAdCopy({
        brief,
        tone: styleOutput.primary.style.tone,
        language: cohort.language,
        goal: brief.goal,
      }),
      generateAdCopy({
        brief,
        tone: styleOutput.contrast.style.tone,
        language: cohort.language,
        goal: brief.goal,
      }),
      generateAdCopy({
        brief,
        tone: styleOutput.safe.style.tone,
        language: cohort.language,
        goal: brief.goal,
      }),
    ]);

    const variantDefs: Array<{
      variant: AdVariant;
      style: typeof styleOutput.primary.style;
      copy: typeof primaryCopyRes.copy;
      reasons: string[];
    }> = [
      {
        variant: "primary",
        style: styleOutput.primary.style,
        copy: primaryCopyRes.copy,
        reasons: styleOutput.primary.reasons,
      },
      {
        variant: "contrast",
        style: styleOutput.contrast.style,
        copy: contrastCopyRes.copy,
        reasons: styleOutput.contrast.reasons,
      },
      {
        variant: "safe",
        style: styleOutput.safe.style,
        copy: safeCopyRes.copy,
        reasons: styleOutput.safe.reasons,
      },
    ];

    const aspects: AdAspect[] = ["1:1", "4:5", "9:16"];
    const createdCreatives: AdCreative[] = [];

    // 6. Render and Persist Creatives Across All Aspect Ratios
    for (const vDef of variantDefs) {
      for (const aspect of aspects) {
        const creativeId = `cr-${vDef.variant}-${aspect.replace(":", "x")}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const filename = `${creativeId}.png`;

        // Render to PNG
        const pngBuffer = await renderCreativeToPng({
          style: vDef.style,
          copy: vDef.copy,
          aspect,
          brandName: brief.brandName,
          seed: `${cohortId}-${vDef.variant}`,
        });

        // Save Image to ImageStore
        const imageUrl = await defaultImageStore.saveImage(pngBuffer, filename);

        const creative: AdCreative = {
          id: creativeId,
          campaignId: campaign.id,
          cohortId,
          variant: vDef.variant,
          aspect,
          style: vDef.style,
          copy: vDef.copy,
          imageUrl,
          trace: tasteProfile.traces,
          styleReasons: vDef.reasons,
          status: "draft",
          createdAt: new Date().toISOString(),
        };

        await globalCreativesRepo.upsert(creative);
        createdCreatives.push(creative);
      }
    }

    // Link creative IDs to the campaign
    campaign.adCreativeIds = createdCreatives.map((c) => c.id);
    campaign.createdInAdStudio = true;
    addCampaignToCatalog(campaign);

    return NextResponse.json({
      campaignId: campaign.id,
      cohortId,
      tasteProfile,
      creatives: createdCreatives,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "llm_error",
        message: err instanceof Error ? err.message : "Failed to generate ad creatives",
      },
      { status: 500 }
    );
  }
}
