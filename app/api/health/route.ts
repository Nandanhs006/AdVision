import { NextResponse } from "next/server";
import { getIntentClient } from "@/lib/intent/client";
import { getMetaAIClient } from "@/lib/ai/meta-client";

export async function GET() {
  const intent = getIntentClient();
  const intentMode = intent.getMode();
  const metaAI = getMetaAIClient();
  const hasMetaKey = metaAI.hasLiveKey();
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    event: "Meta Global AI Developer Hackathon",
    services: {
      metaAI: {
        provider: "Meta Model API",
        mode: metaAI.getMode(),
        models: {
          textAndReasoning: process.env.META_TEXT_MODEL || "muse-spark",
          videoAndScene: process.env.META_VISION_MODEL || "muse-wonder",
          imageGeneration: process.env.META_IMAGE_MODEL || "muse-image",
          surfaceSegmentation: process.env.META_SEGMENTATION_MODEL || "sam-3.1",
        },
        openWeightFallback: process.env.BASETEN_MODEL_ID || "meta-models/muse-spark-open-1026",
        status: hasMetaKey ? "live_meta_api" : "simulated_hackathon_demo",
      },
      intentEngine: {
        mode: intentMode === "live" ? "live_rtb" : "simulated_intent_classification",
        connectors: {
          meta_audience_network: "connected",
          meta_ads_manager: "connected",
        },
        status: intentMode === "live" ? "live" : "fixture (sample data)",
      },
      cache: {
        type: hasRedis ? "Upstash Redis" : "In-Memory LRU (10m TTL)",
      },
    },
    version: "2.0.0-meta-hackathon",
  });
}
