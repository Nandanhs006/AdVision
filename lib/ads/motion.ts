import { Brief, Cohort, StyleSpec, MotionAdPlan, MotionSceneBeat } from "../schema";
import { getMetaAIClient } from "../ai/meta-client";

/**
 * Generates a 15-second 3-act kinetic motion ad plan for in-scene digital billboards
 * using Meta Muse Spark and music beat synchronization principles.
 */
export async function generateMotionAdPlan(params: {
  campaignId: string;
  brief: Brief;
  cohort: Cohort;
  styleSpec: StyleSpec;
}): Promise<MotionAdPlan> {
  const { campaignId, brief, cohort, styleSpec } = params;
  const metaAI = getMetaAIClient();

  // Act 1: Hook (0.0s - 3.5s)
  // Act 2: Benefit / Product Highlight (3.5s - 10.5s)
  // Act 3: CTA & Scannable QR Code (10.5s - 15.0s)

  if (metaAI.hasLiveKey()) {
    try {
      const prompt = `You are Meta Muse Spark, Director of Motion Advertising.
Design a 15-second 3-Act in-scene digital billboard ad for:
Brand: ${brief.brandName}
Product: ${brief.product}
Category: ${brief.category}
Target City: ${cohort.city}, ${cohort.country}
Cohort Anchors: ${cohort.anchors.join(", ")}
Palette: ${JSON.stringify(styleSpec.palette)}
Motif: ${styleSpec.motif}

Output must strictly match this JSON structure:
{
  "beats": [
    {
      "act": 1,
      "name": "Hook",
      "startSec": 0.0,
      "durationSec": 3.5,
      "headline": string (max 5 words, ultra punchy),
      "subhead": string (max 8 words),
      "visualCue": string,
      "motif": "${styleSpec.motif}",
      "sfxCue": "interface/glitch_up"
    },
    {
      "act": 2,
      "name": "Core Benefit",
      "startSec": 3.5,
      "durationSec": 7.0,
      "headline": string (max 6 words),
      "subhead": string (max 10 words),
      "visualCue": string,
      "motif": "${styleSpec.motif}",
      "sfxCue": "impact/drop_bass"
    },
    {
      "act": 3,
      "name": "CTA & QR",
      "startSec": 10.5,
      "durationSec": 4.5,
      "headline": string (max 4 words),
      "subhead": string (max 8 words),
      "visualCue": "Scannable Pause-To-Shop QR Code with Checkout Action",
      "motif": "${styleSpec.motif}",
      "sfxCue": "interface/bell_chime"
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
        if (parsed.beats && Array.isArray(parsed.beats) && parsed.beats.length === 3) {
          return {
            campaignId,
            brandName: brief.brandName,
            totalDurationSec: 15.0,
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

  // Deterministic high-craft fallback calibrated to the brand & style
  const defaultBeats: MotionSceneBeat[] = [
    {
      act: 1,
      name: "Hook",
      startSec: 0.0,
      durationSec: 3.5,
      headline: `${brief.brandName.toUpperCase()} · ARRIVED`,
      subhead: `Designed for ${cohort.city}'s creator generation.`,
      visualCue: `Kinetic ${styleSpec.motif} expansion with flash transition.`,
      motif: styleSpec.motif,
      sfxCue: "interface/glitch_up",
    },
    {
      act: 2,
      name: "Core Benefit",
      startSec: 3.5,
      durationSec: 7.0,
      headline: brief.product,
      subhead: `Pure performance engineered for every split second.`,
      visualCue: `Split typography display with animated accent divider.`,
      motif: styleSpec.motif,
      sfxCue: "impact/drop_bass",
    },
    {
      act: 3,
      name: "CTA & QR",
      startSec: 10.5,
      durationSec: 4.5,
      headline: "SCAN TO SHOP",
      subhead: "Available in limited drops on Instagram Shop.",
      visualCue: "Interactive Pause-To-Shop QR Code with live checkout link.",
      motif: styleSpec.motif,
      sfxCue: "interface/bell_chime",
    },
  ];

  return {
    campaignId,
    brandName: brief.brandName,
    totalDurationSec: 15.0,
    beats: defaultBeats,
    musicTrack: "happy-beats-business-moves-vol-1",
    bpm: 120,
    palette: styleSpec.palette,
    qrLink: `https://instagram.com/p/${brief.brandName.toLowerCase().replace(/\s+/g, "")}`,
    source: "fallback",
    aiModel: "Meta Muse Spark + Muse Wonder",
  };
}
