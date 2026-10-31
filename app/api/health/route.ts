import { NextResponse } from "next/server";
import { getQlooClient } from "@/lib/qloo/client";

export async function GET() {
  const qloo = getQlooClient();
  const qlooMode = qloo.getMode();
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      qloo: {
        mode: qlooMode,
        endpoint: process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com",
        status: qlooMode === "live" ? "live" : "fixture (sample data)",
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
