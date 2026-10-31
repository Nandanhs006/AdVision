import { z } from "zod";
import { Zone, Rules, Viewer, Campaign, Decision } from "./schema";
import { QlooClient, getQlooClient } from "./qloo/client";
import { runDecisionPipeline } from "./decide";

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

interface LLMMessage {
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

export class DecisionAgent {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private qlooClient: QlooClient;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    qlooClient?: QlooClient;
  }) {
    this.apiKey = options?.apiKey || process.env.GROQ_API_KEY || "";
    this.baseUrl =
      options?.baseUrl ||
      process.env.LLM_BASE_URL ||
      "https://api.groq.com/openai/v1";
    this.model =
      options?.model ||
      process.env.LLM_MODEL ||
      "llama-3.3-70b-versatile";
    this.qlooClient = options?.qlooClient || getQlooClient();
  }

  hasLLMKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async decide(params: {
    zone: Zone;
    rules: Rules;
    viewer: Viewer;
    campaigns: Campaign[];
  }): Promise<Decision> {
    const { zone, rules, viewer, campaigns } = params;

    // Guardrail: Shortcuts for ad-free and kids profiles bypass LLM entirely
    if (viewer.adPreference === "adfree" || viewer.adPreference === "kids") {
      return runDecisionPipeline({ zone, rules, viewer, campaigns, qlooClient: this.qlooClient });
    }

    // If no LLM key configured, run deterministic pipeline with fallback label
    if (!this.hasLLMKey()) {
      return runDecisionPipeline({
        zone,
        rules,
        viewer,
        campaigns,
        qlooClient: this.qlooClient,
      });
    }

    try {
      return await this.runToolLoop(zone, rules, viewer, campaigns);
    } catch {
      // Graceful fallback to deterministic pipeline
      const fallbackDecision = await runDecisionPipeline({
        zone,
        rules,
        viewer,
        campaigns,
        qlooClient: this.qlooClient,
      });
      return {
        ...fallbackDecision,
        source: "fallback",
      };
    }
  }

  private async runToolLoop(
    zone: Zone,
    rules: Rules,
    viewer: Viewer,
    campaigns: Campaign[]
  ): Promise<Decision> {
    const tools = [
      {
        type: "function",
        function: {
          name: "qloo_search",
          description: "Search Qloo taste graph for an entity by free-text name",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Entity name to search" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "qloo_brand_insights",
          description: "Get brand affinity ranking for a viewer in a specific location",
          parameters: {
            type: "object",
            properties: {
              locationQuery: { type: "string" },
              entityIds: { type: "array", items: { type: "string" } },
            },
            required: ["locationQuery"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "resolve_tags",
          description: "Resolve scene mood terms to Qloo tag IDs",
          parameters: {
            type: "object",
            properties: {
              term: { type: "string" },
            },
            required: ["term"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "explain_pick",
          description: "Generate concise 2-sentence explanation citing exact affinity and signals",
          parameters: {
            type: "object",
            properties: {
              winnerName: { type: "string" },
              affinityPct: { type: "number" },
              city: { type: "string" },
              signals: { type: "array", items: { type: "string" } },
            },
            required: ["winnerName", "affinityPct", "city"],
          },
        },
      },
    ];

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `You are the Advision Decision Agent. Orchestrate Qloo taste queries and explain the winning brand placement for an in-scene billboard.
Guidelines:
1. Search viewer favorites using qloo_search.
2. Query brand insights for the viewer's city with qloo_brand_insights.
3. Every numeric claim must match the exact data returned by Qloo.
4. Keep explanations to 2 sentences strictly citing real affinity scores.`,
      },
      {
        role: "user",
        content: `Zone: ${zone.label} (Area: ${(zone.frameShare * 100).toFixed(1)}%).
Viewer: ${viewer.name} in ${viewer.city}, ${viewer.country} (Language: ${viewer.language}). Favorites: ${viewer.favorites.join(", ")}.
Editor Rules: Blocked categories: [${rules.blockedCategories.join(", ")}], Allowed categories: [${rules.allowedCategories.join(", ")}], Prominence Cap: ${(rules.prominenceCap * 100).toFixed(0)}%. Mood: [${rules.sceneMood.join(", ")}].
Available Campaign Brands: ${campaigns.map((c) => c.brandName).join(", ")}.
Plan and execute tool calls to pick the optimal brand.`,
      },
    ];

    let customExplanation: string | undefined;

    // Tool loop with max 6 steps
    for (let step = 0; step < 6; step++) {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        break;
      }

      const resJson = await response.json();
      const choice = resJson.choices?.[0];
      if (!choice) break;

      const assistantMsg = choice.message;
      messages.push(assistantMsg);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        // LLM finished tool calls
        break;
      }

      // Execute tool calls
      for (const tc of assistantMsg.tool_calls) {
        const fnName = tc.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }

        let result: unknown = {};
        if (fnName === "qloo_search") {
          result = await this.qlooClient.search(String(args.query || ""));
        } else if (fnName === "qloo_brand_insights") {
          result = await this.qlooClient.brandInsights({
            locationQuery: String(args.locationQuery || viewer.city),
            entityIds: Array.isArray(args.entityIds) ? args.entityIds : undefined,
          });
        } else if (fnName === "resolve_tags") {
          result = await this.qlooClient.resolveTags(String(args.term || ""));
        } else if (fnName === "explain_pick") {
          customExplanation = `${args.winnerName} matched with ${args.affinityPct}% affinity for ${viewer.name} in ${args.city}.`;
          result = { success: true, explanation: customExplanation };
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: fnName,
          content: JSON.stringify(result),
        });
      }
    }

    // Guardrail: Always pass final evaluation through deterministic pipeline to guarantee rules
    const finalDecision = await runDecisionPipeline({
      zone,
      rules,
      viewer,
      campaigns,
      qlooClient: this.qlooClient,
      llmExplainer: customExplanation ? async () => customExplanation! : undefined,
    });

    return finalDecision;
  }
}
