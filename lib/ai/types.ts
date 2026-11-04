import { z } from "zod";
import { Point2D } from "../schema";

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface AIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
}

export interface AgentResult {
  winnerBrand: string;
  category: string;
  intentScore: number;
  explanation: string;
  reasoningTrace: Array<{
    step: number;
    action: string;
    output: string;
  }>;
  status: "approved" | "blocked" | "capped" | "fallback";
}

export interface SurfaceSegment {
  id: string;
  label: string;
  confidence: number;
  maskPolygon: Point2D[];
  quad: Point2D[]; // 4 corners normalized [TL, TR, BR, BL]
  frameShare: number;
  contrastRatio: string;
  suggestedCap: number;
}

export interface VideoSceneAnalysis {
  filmTitle: string;
  timestampSec: number;
  atmosphereTags: string[];
  lighting: "bright_day" | "golden_hour" | "neon_night" | "moody_overcast";
  brandSafetyRating: "safe" | "caution" | "restricted";
  candidateSurfaces: SurfaceSegment[];
}
