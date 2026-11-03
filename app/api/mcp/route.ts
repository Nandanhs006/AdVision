import { NextRequest, NextResponse } from "next/server";
import { getIntentClient } from "@/lib/intent/client";
import { runDecisionPipeline } from "@/lib/decide";
import { buildTasteProfile } from "@/lib/ads/taste-profile";
import { mapTasteToStyle } from "@/lib/ads/taste-to-style";
import campaignsJson from "@/data/campaigns.json";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import { Campaign, Viewer, Zone, Rules } from "@/lib/schema";

// Standard MCP tool definitions
const MCP_TOOLS = [
  {
    name: "intent_search",
    description: "Search commercial intent graph and taxonomy for an entity ID by free-text name or query",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or entity name" },
        take: { type: "number", description: "Number of results to return", default: 5 },
      },
      required: ["query"],
    },
  },
  {
    name: "brand_insights",
    description: "Query brand purchase intent and ad network affinity scores in a target city based on entities and tags",
    inputSchema: {
      type: "object",
      properties: {
        locationQuery: { type: "string", description: "City or region name (e.g. Tokyo, Paris)" },
        entityIds: { type: "array", items: { type: "string" }, description: "Interests entity IDs" },
        tagIds: { type: "array", items: { type: "string" }, description: "Scene mood or category tags" },
      },
      required: ["locationQuery"],
    },
  },
  {
    name: "resolve_tags",
    description: "Resolve scene mood or descriptive terms into standardized commercial intent taxonomy tags",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "Mood or style descriptor (e.g. cyberpunk, rainy)" },
      },
      required: ["term"],
    },
  },
  {
    name: "decide_ad",
    description: "Run the full SceneCast intent decision pipeline for a zone, rules, and viewer profile",
    inputSchema: {
      type: "object",
      properties: {
        viewerId: { type: "string", description: "ID of seeded viewer" },
        zoneId: { type: "string", description: "ID of zone" },
        blockedCategories: { type: "array", items: { type: "string" } },
        allowedCategories: { type: "array", items: { type: "string" } },
        prominenceCap: { type: "number", default: 0.35 },
      },
      required: ["viewerId"],
    },
  },
  {
    name: "ads_taste_profile",
    description: "Build an intent profile for a cohort of viewers based on cultural anchors and geography (read-only)",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Target city (e.g. Tokyo, New York)" },
        country: { type: "string", description: "Target country" },
        language: { type: "string", description: "Target language (e.g. ja, en, te, kn, fr)" },
        ageBand: { type: "string", description: "Age band (e.g. 21-30, 25-34)" },
        anchors: { type: "array", items: { type: "string" }, description: "3 to 5 cultural anchors (artists, films, places)" },
        goal: { type: "string", enum: ["awareness", "traffic", "sales"], default: "awareness" },
      },
      required: ["city", "country", "anchors"],
    },
  },
  {
    name: "ads_generate_variants",
    description: "Generate intent-informed ad style variants (palette, layout, motif, typeStyle) and tone reasons for a brand brief and cohort (read-only)",
    inputSchema: {
      type: "object",
      properties: {
        brandName: { type: "string", description: "Brand name" },
        product: { type: "string", description: "Product name" },
        category: { type: "string", description: "Product category" },
        goal: { type: "string", enum: ["awareness", "traffic", "sales"], default: "awareness" },
        city: { type: "string", description: "Target city" },
        country: { type: "string", description: "Target country" },
        language: { type: "string", description: "Target language" },
        ageBand: { type: "string", description: "Age range" },
        anchors: { type: "array", items: { type: "string" }, description: "3 to 5 taste anchors" },
      },
      required: ["brandName", "product", "category", "city", "country", "anchors"],
    },
  },
];

export async function GET() {
  return NextResponse.json({
    name: "scenecast-mcp-server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    tools: MCP_TOOLS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id = "1" } = body;
    const client = getIntentClient();

    // 1. Tool Listing
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    // 2. Tool Execution
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === "intent_search" || toolName === "qloo_search") {
        const res = await client.search(String(args.query || ""), undefined, Number(args.take || 5));
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(res) }] },
        });
      }

      if (toolName === "brand_insights" || toolName === "qloo_brand_insights") {
        const res = await client.brandInsights({
          locationQuery: String(args.locationQuery || "Tokyo"),
          entityIds: Array.isArray(args.entityIds) ? args.entityIds : undefined,
          tagIds: Array.isArray(args.tagIds) ? args.tagIds : undefined,
        });
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(res) }] },
        });
      }

      if (toolName === "resolve_tags") {
        const res = await client.resolveTags(String(args.term || ""));
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(res) }] },
        });
      }

      if (toolName === "decide_ad") {
        const viewers = viewersJson as Viewer[];
        const campaigns = campaignsJson as Campaign[];
        const projects = projectsJson as Array<{ zones: Zone[]; rules: Rules }>;
        const viewer = viewers.find((v) => v.id === args.viewerId) || viewers[0];
        const zone = projects[0]?.zones.find((z) => z.id === args.zoneId) || projects[0]?.zones[0];
        const rules: Rules = {
          allowedCategories: args.allowedCategories || [],
          blockedCategories: args.blockedCategories || ["spirits"],
          prominenceCap: args.prominenceCap ?? 0.35,
          requireApproval: false,
          sceneMood: ["urban", "neon"],
        };

        const decision = await runDecisionPipeline({
          zone,
          rules,
          viewer,
          campaigns,
          intentClient: client,
        });

        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(decision) }] },
        });
      }

      if (toolName === "ads_taste_profile") {
        const cohort = {
          city: String(args.city || "Tokyo"),
          country: String(args.country || "Japan"),
          language: String(args.language || "ja"),
          ageBand: String(args.ageBand || "25-34"),
          anchors: Array.isArray(args.anchors) ? args.anchors : ["Ryuichi Sakamoto", "Haruki Murakami", "Daikanyama T-Site"],
          goal: (args.goal === "sales" || args.goal === "traffic" ? args.goal : "awareness") as "awareness" | "traffic" | "sales",
        };
        const profile = await buildTasteProfile(cohort, { client });
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(profile) }] },
        });
      }

      if (toolName === "ads_generate_variants") {
        const cohort = {
          city: String(args.city || "Tokyo"),
          country: String(args.country || "Japan"),
          language: String(args.language || "ja"),
          ageBand: String(args.ageBand || "25-34"),
          anchors: Array.isArray(args.anchors) ? args.anchors : ["Ryuichi Sakamoto", "Haruki Murakami", "Daikanyama T-Site"],
          goal: (args.goal === "sales" || args.goal === "traffic" ? args.goal : "awareness") as "awareness" | "traffic" | "sales",
        };
        const profile = await buildTasteProfile(cohort, {
          client,
          keywords: [String(args.category || ""), String(args.product || "")],
        });
        const styles = mapTasteToStyle(profile, `cohort-${cohort.city.toLowerCase()}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify({ tasteProfile: profile, variants: styles }) }] },
        });
      }

      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32601, message: `Method or tool '${toolName}' not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request: Unhandled JSON-RPC method" } },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal MCP Server Error";
    return NextResponse.json(
      { jsonrpc: "2.0", id: "1", error: { code: -32603, message } },
      { status: 500 }
    );
  }
}
