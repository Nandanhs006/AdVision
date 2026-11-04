import { Brief, Cohort, StyleSpec, MotionAdPlan, MotionSceneBeat } from "../schema";
import { getMetaAIClient } from "../ai/meta-client";

/**
 * Generates a kinetic motion ad plan for in-scene digital billboards and video displays
 * using Meta Muse Spark and music beat synchronization principles.
 * Supports configurable durations from 5 seconds up to 3 minutes (180s).
 */
export async function generateMotionAdPlan(params: {
  campaignId: string;
  brief: Brief;
  cohort: Cohort;
  styleSpec: StyleSpec;
  durationSec?: number;
}): Promise<MotionAdPlan> {
  const { campaignId, brief, cohort, styleSpec } = params;
  const metaAI = getMetaAIClient();

  // Clamp duration to valid hackathon window: 5s minimum up to 180s (3 minutes) maximum
  const targetDuration = Math.min(Math.max(params.durationSec ?? 15.0, 5.0), 180.0);

  // Determine narrative acts breakdown based on duration
  const actCount =
    targetDuration <= 20
      ? 3
      : targetDuration <= 45
      ? 4
      : targetDuration <= 90
      ? 5
      : 6;

  if (metaAI.hasLiveKey()) {
    try {
      const prompt = `You are Meta Muse Spark, Director of Motion Advertising.
Design a ${targetDuration.toFixed(1)}-second ${actCount}-Act in-scene digital billboard ad for:
Brand: ${brief.brandName}
Product: ${brief.product}
Category: ${brief.category}
Target City: ${cohort.city}, ${cohort.country}
Cohort Anchors: ${cohort.anchors.join(", ")}
Palette: ${JSON.stringify(styleSpec.palette)}
Motif: ${styleSpec.motif}
Total Duration: ${targetDuration.toFixed(1)} seconds
Number of Acts: ${actCount}

The sequence of acts should span from 0.0s to exactly ${targetDuration.toFixed(1)}s, with the final act ending at ${targetDuration.toFixed(1)}s featuring an interactive QR code checkout action.

Output must strictly match this JSON structure:
{
  "beats": [
    {
      "act": number (1 to ${actCount}),
      "name": string (e.g. "Hook", "Narrative", "Innovation", "Proof", "CTA & QR"),
      "startSec": number,
      "durationSec": number,
      "headline": string (punchy and bold, max 8 words),
      "subhead": string (compelling context, max 12 words),
      "visualCue": string,
      "motif": "${styleSpec.motif}",
      "sfxCue": string (e.g. "interface/glitch_up", "impact/drop_bass", "interface/bell_chime")
    }
  ]
}`;

      const res = await metaAI.chat([
        {
          role: "system",
          content: "You are Meta Muse Spark. Only reply with valid JSON, no markdown.",
        },
        { role: "user", content: prompt },
      ]);

      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.beats && Array.isArray(parsed.beats) && parsed.beats.length >= 3) {
          return {
            campaignId,
            brandName: brief.brandName,
            totalDurationSec: targetDuration,
            beats: parsed.beats,
            musicTrack: "happy-beats-business-moves-vol-1",
            bpm: 120,
            palette: styleSpec.palette,
            qrLink: `https://instagram.com/p/${brief.brandName.toLowerCase().replace(/\s+/g, "")}`,
            source: "meta_muse_spark",
            aiModel: "Meta Muse Spark + Muse Wonder",
          };
        }
      }
    } catch (e) {
      console.warn("[Motion] Live Muse Spark motion generation fallback:", e);
    }
  }

  // Deterministic high-craft multi-act structure calibrated to exact duration
  const defaultBeats = buildDeterministicBeats({
    targetDuration,
    actCount,
    brief,
    cohort,
    styleSpec,
  });

  return {
    campaignId,
    brandName: brief.brandName,
    totalDurationSec: targetDuration,
    beats: defaultBeats,
    musicTrack: "happy-beats-business-moves-vol-1",
    bpm: 120,
    palette: styleSpec.palette,
    qrLink: `https://instagram.com/p/${brief.brandName.toLowerCase().replace(/\s+/g, "")}`,
    source: "fallback",
    aiModel: "Meta Muse Spark + Muse Wonder",
  };
}

/**
 * Builds dynamically scaled beat breakdowns for any requested duration up to 180 seconds.
 */
function buildDeterministicBeats(params: {
  targetDuration: number;
  actCount: number;
  brief: Brief;
  cohort: Cohort;
  styleSpec: StyleSpec;
}): MotionSceneBeat[] {
  const { targetDuration, brief, cohort, styleSpec } = params;

  if (targetDuration <= 20) {
    // 3-Act Standard Sprint (e.g. 15s)
    const tHook = Number((targetDuration * 0.233).toFixed(1));
    const tBenefit = Number((targetDuration * 0.467).toFixed(1));
    const tCTA = Number((targetDuration - tHook - tBenefit).toFixed(1));

    return [
      {
        act: 1,
        name: "Hook",
        startSec: 0.0,
        durationSec: tHook,
        headline: `${brief.brandName.toUpperCase()} · ARRIVED`,
        subhead: `Designed for ${cohort.city}'s creator generation.`,
        visualCue: `Kinetic ${styleSpec.motif} expansion with flash transition.`,
        motif: styleSpec.motif,
        sfxCue: "interface/glitch_up",
      },
      {
        act: 2,
        name: "Core Benefit",
        startSec: tHook,
        durationSec: tBenefit,
        headline: brief.product,
        subhead: "Pure performance engineered for every split second.",
        visualCue: "Split typography display with animated accent divider.",
        motif: styleSpec.motif,
        sfxCue: "impact/drop_bass",
      },
      {
        act: 3,
        name: "CTA & QR",
        startSec: Number((tHook + tBenefit).toFixed(1)),
        durationSec: tCTA,
        headline: "SCAN TO SHOP",
        subhead: "Available in limited drops on Instagram Shop.",
        visualCue: "Interactive Pause-To-Shop QR Code with live checkout link.",
        motif: styleSpec.motif,
        sfxCue: "interface/bell_chime",
      },
    ];
  }

  if (targetDuration <= 45) {
    // 4-Act Social Spot (e.g. 30s)
    const t1 = Number((targetDuration * 0.20).toFixed(1));
    const t2 = Number((targetDuration * 0.30).toFixed(1));
    const t3 = Number((targetDuration * 0.30).toFixed(1));
    const t4 = Number((targetDuration - t1 - t2 - t3).toFixed(1));

    return [
      {
        act: 1,
        name: "Cultural Hook",
        startSec: 0.0,
        durationSec: t1,
        headline: `${brief.brandName.toUpperCase()}`,
        subhead: `The new standard for ${cohort.city}.`,
        visualCue: `Kinetic pulse with ${styleSpec.motif} background field.`,
        motif: styleSpec.motif,
        sfxCue: "interface/glitch_up",
      },
      {
        act: 2,
        name: "The Problem",
        startSec: t1,
        durationSec: t2,
        headline: "RETHINK ROUTINE",
        subhead: "Conventional solutions slow your momentum.",
        visualCue: "Minimal high-contrast typography with rapid scanlines.",
        motif: styleSpec.motif,
        sfxCue: "impact/riser",
      },
      {
        act: 3,
        name: "Flagship Feature",
        startSec: Number((t1 + t2).toFixed(1)),
        durationSec: t3,
        headline: brief.product,
        subhead: "Zero friction. Absolute precision in every detail.",
        visualCue: "3D perspective showcase with kinetic accent overlays.",
        motif: styleSpec.motif,
        sfxCue: "impact/drop_bass",
      },
      {
        act: 4,
        name: "Shop & Action",
        startSec: Number((t1 + t2 + t3).toFixed(1)),
        durationSec: t4,
        headline: "INSTANT ACCESS",
        subhead: "Point your phone camera to unlock exclusive benefits.",
        visualCue: "Pause-To-Shop QR Code with Instagram checkout overlay.",
        motif: styleSpec.motif,
        sfxCue: "interface/bell_chime",
      },
    ];
  }

  if (targetDuration <= 90) {
    // 5-Act Showcase (e.g. 60s / 1 min)
    const t1 = Number((targetDuration * 0.15).toFixed(1));
    const t2 = Number((targetDuration * 0.25).toFixed(1));
    const t3 = Number((targetDuration * 0.30).toFixed(1));
    const t4 = Number((targetDuration * 0.15).toFixed(1));
    const t5 = Number((targetDuration - t1 - t2 - t3 - t4).toFixed(1));

    return [
      {
        act: 1,
        name: "Opening Hook",
        startSec: 0.0,
        durationSec: t1,
        headline: brief.brandName.toUpperCase(),
        subhead: `A new dawn in ${cohort.city}.`,
        visualCue: "Slow cinematic text reveal with ambient depth map.",
        motif: styleSpec.motif,
        sfxCue: "interface/glitch_up",
      },
      {
        act: 2,
        name: "Urban Atmosphere",
        startSec: t1,
        durationSec: t2,
        headline: "DESIGNED FOR MOVERS",
        subhead: `Tailored for creators inspired by ${cohort.anchors[0] || "culture"}.`,
        visualCue: "Split-panel montage with kinetic typography tracks.",
        motif: styleSpec.motif,
        sfxCue: "impact/sub_boom",
      },
      {
        act: 3,
        name: "Innovation In Action",
        startSec: Number((t1 + t2).toFixed(1)),
        durationSec: t3,
        headline: brief.product,
        subhead: "Mastered down to the micron. Unrivaled experience.",
        visualCue: "Dynamic multi-axis layout with high-energy beat tracking.",
        motif: styleSpec.motif,
        sfxCue: "impact/drop_bass",
      },
      {
        act: 4,
        name: "Social Validation",
        startSec: Number((t1 + t2 + t3).toFixed(1)),
        durationSec: t4,
        headline: "LOVED GLOBALLY",
        subhead: "Ranked #1 by tastemakers across 18 countries.",
        visualCue: "Social proof badge cluster with verified community metrics.",
        motif: styleSpec.motif,
        sfxCue: "interface/chime_soft",
      },
      {
        act: 5,
        name: "Interactive Finale & QR",
        startSec: Number((t1 + t2 + t3 + t4).toFixed(1)),
        durationSec: t5,
        headline: "SCAN & IMMERSE",
        subhead: "Instant seamless checkout and augmented reality try-on.",
        visualCue: "Glow QR target with tap-to-expand Instagram Shop card.",
        motif: styleSpec.motif,
        sfxCue: "interface/bell_chime",
      },
    ];
  }

  // 6-Act Cinematic Brand Epic (90s - 180s / 3 minutes)
  const t1 = Number((targetDuration * 0.12).toFixed(1));
  const t2 = Number((targetDuration * 0.20).toFixed(1));
  const t3 = Number((targetDuration * 0.28).toFixed(1));
  const t4 = Number((targetDuration * 0.20).toFixed(1));
  const t5 = Number((targetDuration * 0.10).toFixed(1));
  const t6 = Number((targetDuration - t1 - t2 - t3 - t4 - t5).toFixed(1));

  return [
    {
      act: 1,
      name: "Cinematic Prelude",
      startSec: 0.0,
      durationSec: t1,
      headline: brief.brandName.toUpperCase(),
      subhead: `The evolution begins in ${cohort.city}.`,
      visualCue: "Wide atmospheric typography with slow particle drift.",
      motif: styleSpec.motif,
      sfxCue: "interface/glitch_up",
    },
    {
      act: 2,
      name: "The Mission",
      startSec: t1,
      durationSec: t2,
      headline: "CHALLENGING CONVENTION",
      subhead: `Where ${cohort.anchors[0] || "craft"} meets modern velocity.`,
      visualCue: "Geometric typography slices reacting to rhythmic downbeats.",
      motif: styleSpec.motif,
      sfxCue: "impact/riser",
    },
    {
      act: 3,
      name: "The Breakthrough",
      startSec: Number((t1 + t2).toFixed(1)),
      durationSec: t3,
      headline: brief.product,
      subhead: "Re-engineered from first principles for uncompromising quality.",
      visualCue: "High-contrast focal point with kinetic zoom animations.",
      motif: styleSpec.motif,
      sfxCue: "impact/drop_bass",
    },
    {
      act: 4,
      name: "Performance In Depth",
      startSec: Number((t1 + t2 + t3).toFixed(1)),
      durationSec: t4,
      headline: "MASTERED FOR IMPACT",
      subhead: "Seamless integration into your everyday flow.",
      visualCue: "Dynamic split-screen showcase with synchronized beat markers.",
      motif: styleSpec.motif,
      sfxCue: "impact/sub_boom",
    },
    {
      act: 5,
      name: "Community Movement",
      startSec: Number((t1 + t2 + t3 + t4).toFixed(1)),
      durationSec: t5,
      headline: "JOIN THE COLLECTIVE",
      subhead: "Thousands of early adopters are already shaping tomorrow.",
      visualCue: "Community testimonial stream with live engagement counters.",
      motif: styleSpec.motif,
      sfxCue: "interface/chime_soft",
    },
    {
      act: 6,
      name: "Interactive Storefront & QR",
      startSec: Number((t1 + t2 + t3 + t4 + t5).toFixed(1)),
      durationSec: t6,
      headline: "LIMITED LAUNCH ACCESS",
      subhead: "Scan your mobile camera now to secure your exclusive allotment.",
      visualCue: "High-density scannable QR portal with dynamic purchase guarantee.",
      motif: styleSpec.motif,
      sfxCue: "interface/bell_chime",
    },
  ];
}
