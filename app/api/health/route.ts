import { NextResponse } from "next/server";
import { getIntentClient } from "@/lib/intent/client";

export async function GET() {
  const intent = getIntentClient();
  const intentMode = intent.getMode();
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      intentEngine: {
        mode: intentMode === "live" ? "live_rtb" : "simulated_intent_classification",
        connectors: {
          google_adsense: "connected",
          meta_ads: "connected",
        },
        status: intentMode === "live" ? "live" : "fixture (sample data)",
      },
      llm: {
        provider: "Groq / OpenAI-compatible",
        model: process.env.LLM_MODEL || "llama-3.3-70b-versatile",
        status: hasGroqKey ? "live" : "fallback (template/deterministic)",
      },
      cache: {
        type: hasRedis ? "Upstash Redis" : "In-Memory LRU (10m TTL)",
      },
    },
    version: "1.0.0",
  });
}
