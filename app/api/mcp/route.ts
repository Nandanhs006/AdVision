import { NextRequest, NextResponse } from "next/server";
import { getQlooClient } from "@/lib/qloo/client";
import { runDecisionPipeline } from "@/lib/decide";
import campaignsJson from "@/data/campaigns.json";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import { Campaign, Viewer, Zone, Rules } from "@/lib/schema";

// Standard MCP tool definitions
const MCP_TOOLS = [
  {
    name: "qloo_search",
    description: "Search Qloo taste graph for an entity ID by free-text name or query",
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
    name: "qloo_brand_insights",
    description: "Query Qloo for brand affinity scores in a target city based on entities and tags",
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
    description: "Resolve scene mood or descriptive terms into standardized Qloo tag IDs",
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
    description: "Run the full Advision decision pipeline for a zone, rules, and viewer profile",
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
];

export async function GET() {
  return NextResponse.json({
    name: "advision-mcp-server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    tools: MCP_TOOLS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id = "1" } = body;
    const qloo = getQlooClient();

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

      if (toolName === "qloo_search") {
        const res = await qloo.search(String(args.query || ""), undefined, Number(args.take || 5));
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(res) }] },
        });
      }

      if (toolName === "qloo_brand_insights") {
        const res = await qloo.brandInsights({
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
        const res = await qloo.resolveTags(String(args.term || ""));
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
          qlooClient: qloo,
        });

        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(decision) }] },
        });
      }

      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32601, message: `Tool not found: ${toolName}` } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32600, message: `Unsupported method: ${method}` } },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message } },
      { status: 500 }
    );
  }
}
