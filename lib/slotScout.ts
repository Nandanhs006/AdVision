import { Point2D } from "./schema";
import { getMetaAIClient } from "./ai/meta-client";
import { detectSurfacesFromFrame } from "./ai/vision-surface";

export interface ScoutedSlot {
  id: string;
  label: string;
  quad: Point2D[];
  startSec: number;
  endSec: number;
  frameShare: number;
  placementScore: number; // 0-100
  suggestedCap: number;   // 0.05-0.60
  contrastRatio: string;
  legibilityIndex: number;// 0-100
  occlusionRisk: "low" | "medium" | "high";
  suggestedMood: string[];
  reason: string;
  modelOrigin?: string;
}

export interface SlotScoutResult {
  filmTitle: string;
  scoutedAtSec: number;
  slots: ScoutedSlot[];
  sceneAtmosphere: string[];
  aiModel?: string;
}

/**
 * AI Slot Scout utilizing Meta SAM 3.1 (Segment Anything Model 3.1) and Meta Muse Wonder
 * to discover candidate in-scene ad placement surfaces and classify atmosphere.
 */
export async function runSlotScout(params: {
  filmTitle: string;
  currentSec: number;
  durationSec: number;
  frameImage?: string;
  clickPoint?: Point2D;
}): Promise<SlotScoutResult> {
  const { filmTitle, currentSec, durationSec, frameImage, clickPoint } = params;
  const metaClient = getMetaAIClient();

  // If real frame image or point prompt is provided, run real vision surface detection
  if (frameImage || clickPoint) {
    const detected = detectSurfacesFromFrame({ frameBase64: frameImage, clickPoint, filmTitle });
    const slots: ScoutedSlot[] = detected.map((s, idx) => ({
      id: `slot-real-${Date.now()}-${idx + 1}`,
      label: s.label,
      quad: s.quad,
      startSec: 0.2,
      endSec: Math.min(durationSec, durationSec > 1 ? durationSec - 0.5 : 19.5),
      frameShare: s.frameShare,
      placementScore: Math.round(s.confidence * 100),
      suggestedCap: s.suggestedCap,
      contrastRatio: s.contrastRatio,
      legibilityIndex: Math.round(s.confidence * 98),
      occlusionRisk: "low",
      suggestedMood: ["prominent", "high-visibility", "in-scene", "calibrated"],
      reason: s.reason,
      modelOrigin: "Meta SAM 3.1 (Visual Frame Analyzer)",
    }));

    return {
      filmTitle,
      scoutedAtSec: Number(currentSec.toFixed(1)),
      slots,
      sceneAtmosphere: ["in-scene", "billboard", "display", "high-visibility"],
      aiModel: "Meta SAM 3.1 & Muse Wonder",
    };
  }

  // Ingest scene context and segment candidate surfaces using Meta AI
  const sceneAnalysis = await metaClient.analyzeVideoScene(filmTitle, currentSec);

  const slots: ScoutedSlot[] = sceneAnalysis.candidateSurfaces.map((surface, idx) => ({
    id: `slot-${surface.id}-${Date.now()}-${idx + 1}`,
    label: surface.label,
    quad: surface.quad,
    startSec: 0.2,
    endSec: Math.min(durationSec, durationSec > 1 ? durationSec - 0.5 : 19.5),
    frameShare: surface.frameShare,
    placementScore: Math.round(surface.confidence * 100),
    suggestedCap: surface.suggestedCap,
    contrastRatio: surface.contrastRatio,
    legibilityIndex: Math.round(surface.confidence * 98),
    occlusionRisk: "low",
    suggestedMood: sceneAnalysis.atmosphereTags.slice(0, 4),
    reason: `Identified by Meta SAM 3.1 with ${(surface.confidence * 100).toFixed(1)}% planar certainty. Lighting: ${sceneAnalysis.lighting}.`,
    modelOrigin: "Meta SAM 3.1 + Muse Wonder",
  }));

  return {
    filmTitle,
    scoutedAtSec: Number(currentSec.toFixed(1)),
    slots,
    sceneAtmosphere: sceneAnalysis.atmosphereTags,
    aiModel: "Meta SAM 3.1 & Muse Wonder",
  };
}
