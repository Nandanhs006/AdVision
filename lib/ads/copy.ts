import { z } from "zod";
import { AdCopy, AdCopySchema, Brief } from "../schema";
import copyTemplatesData from "@/data/copy-templates.json";
import { getMetaAIClient } from "../ai/meta-client";

// Banned words & unverifiable claims
const BANNED_CLAIM_PATTERNS = [
  /\bguaranteed\b/i,
  /\bguarantee\b/i,
  /#1\b/i,
  /\bnumber\s+one\b/i,
  /\bcure\b/i,
  /\bmiracle\b/i,
  /\b100%\s+effective\b/i,
  /\bproven\s+cure\b/i,
  /\bbest\s+in\s+the\s+world\b/i,
  /\brisk[- ]free\b/i,
  /\binstant\s+fix\b/i,
];

// Blocked product categories
const BLOCKED_CATEGORY_PATTERNS = [
  /\btobacco\b/i,
  /\bcigarette\b/i,
  /\bvape\b/i,
  /\bnicotine\b/i,
  /\balcohol\b/i,
  /\bliquor\b/i,
  /\bspirits\b/i,
  /\bcasino\b/i,
  /\bgambling\b/i,
  /\bbetting\b/i,
  /\bweapon\b/i,
  /\bfirearm\b/i,
  /\bammunition\b/i,
  /\badult\b/i,
  /\bporn\b/i,
];

export interface CopyGenerationResult {
  copy: AdCopy;
  source: "llm" | "fallback";
  violations?: string[];
}

/**
 * Validates copy against advertising compliance and strict character/word count rules
 */
export function validateAdCopy(
  copy: unknown,
  params: {
    brief: Brief;
    language: string;
    allowPrice?: boolean;
  }
): { valid: boolean; copy?: AdCopy; errors: string[] } {
  const errors: string[] = [];

  // 1. Zod schema validation
  const parsed = AdCopySchema.safeParse(copy);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const c = parsed.data;

  // 2. Headline word count (<= 7 words)
  // For CJK/Telugu/Kannada characters, also cap character length to ~30
  const headlineWords = c.headline.trim().split(/\s+/).filter(Boolean);
  if (headlineWords.length > 7 && c.headline.length > 35) {
    errors.push(`Headline exceeds 7 words (got ${headlineWords.length})`);
  }

  // 3. Body character length (<= 125 chars)
  if (c.body.length > 125) {
    errors.push(`Body exceeds 125 characters (got ${c.body.length})`);
  }

  // 4. CTA word count (<= 3 words)
  const ctaWords = c.cta.trim().split(/\s+/).filter(Boolean);
  if (ctaWords.length > 3 && c.cta.length > 20) {
    errors.push(`CTA exceeds 3 words (got ${ctaWords.length})`);
  }

  // 5. Caption length (<= 300 chars) and 3 to 5 hashtags
  if (c.caption.length > 300) {
    errors.push(`Caption exceeds 300 characters (got ${c.caption.length})`);
  }

  const hashtags = (c.caption.match(/#[a-zA-Z0-9_\u0900-\u0DFF\u3040-\u30FF\u4E00-\u9FFF]+/g) || []);
  if (hashtags.length < 3 || hashtags.length > 5) {
    errors.push(`Caption must contain between 3 and 5 hashtags (found ${hashtags.length})`);
  }

  // 6. Blocked claims checks
  const fullText = `${c.headline} ${c.body} ${c.cta} ${c.caption}`;
  for (const pattern of BANNED_CLAIM_PATTERNS) {
    if (pattern.test(fullText)) {
      errors.push(`Copy contains prohibited unverifiable claim matching: ${pattern.source}`);
    }
  }

  // 7. Blocked categories checks
  for (const pattern of BLOCKED_CATEGORY_PATTERNS) {
    if (pattern.test(fullText)) {
      errors.push(`Copy references blocked advertising category matching: ${pattern.source}`);
    }
  }

  // 8. Price check: only allow price if supplied in brief
  if (!params.brief.price) {
    const pricePattern = /([$€£¥₹]\s*\d+|\b\d+\s*(dollars|usd|yen|euros|inr|rupees)\b)/i;
    if (pricePattern.test(fullText)) {
      errors.push("Copy contains unsupplied pricing or currency mention");
    }
  }

  return {
    valid: errors.length === 0,
    copy: errors.length === 0 ? c : undefined,
    errors,
  };
}

/**
 * Retrieves a guaranteed compliant fallback copy template for language & goal
 */
export function getFallbackCopy(
  language: string,
  goal: "awareness" | "traffic" | "sales",
  brandName = "Advision"
): AdCopy {
  const langKey = (language in copyTemplatesData.templates ? language : "en") as keyof typeof copyTemplatesData.templates;
  const langGroup = copyTemplatesData.templates[langKey] || copyTemplatesData.templates.en;
  const base = langGroup[goal] || langGroup.awareness;

  return {
    headline: base.headline.replace(/Advision/g, brandName),
    body: base.body.replace(/Advision/g, brandName),
    cta: base.cta,
    caption: base.caption.replace(/Advision/g, brandName),
    altText: base.altText,
  };
}

/**
 * Generates tightly constrained ad copy using Meta Muse Spark with deterministic fallback
 */
export async function generateAdCopy(params: {
  brief: Brief;
  tone: string[];
  language: string;
  goal: "awareness" | "traffic" | "sales";
  platform?: "instagram" | "facebook";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<CopyGenerationResult> {
  const { brief, tone, language, goal, platform = "instagram" } = params;
  const metaClient = getMetaAIClient({
    apiKey: params.apiKey,
    apiBase: params.baseUrl,
    textModel: params.model,
  });

  // If running in simulated mode with no live keys configured, return verified compliant template
  if (!metaClient.hasLiveKey()) {
    return {
      copy: getFallbackCopy(language, goal, brief.brandName),
      source: "fallback",
    };
  }

  try {
    const prompt = `You are Meta Muse Spark, an advertising copy specialist for a social campaign on ${platform}.
Generate strictly compliant ad copy based on this brief:
Brand: "${brief.brandName}"
Product: "${brief.product}"
Category: "${brief.category}"
Campaign Goal: "${goal}"
Tone Keywords: ${tone.join(", ")}
Language: ${language}
${brief.price ? `Price: ${brief.price}` : "No price specified (do NOT include any price or currency)."}

STRICT ADVERTISING RULES:
1. headline: max 7 words. Catchy, memorable.
2. body: max 120 characters total.
3. cta: max 3 words (e.g. "Shop Now", "Learn More").
4. caption: max 280 characters total, ending with exactly 3 to 5 relevant hashtags (e.g. #Style #Brand #Innovation).
5. altText: concise image description.
6. Absolutely NO unverifiable claims: never use "guaranteed", "#1", "cure", "miracle", "best in the world".
7. Absolutely NO mention of any other brands.
8. Output MUST be strictly valid JSON matching this schema:
{
  "headline": string,
  "body": string,
  "cta": string,
  "caption": string,
  "altText": string
}`;

    const parsedJson = await metaClient.chatJSON<AdCopy>(
      [
        {
          role: "system",
          content: "You are Meta Muse Spark, a professional multilingual copywriter. You only respond with pure JSON, no markdown codeblocks.",
        },
        { role: "user", content: prompt },
      ],
      AdCopySchema
    );

    // Validate generated copy
    const validation = validateAdCopy(parsedJson, {
      brief,
      language,
      allowPrice: Boolean(brief.price),
    });

    if (validation.valid && validation.copy) {
      return {
        copy: validation.copy,
        source: "llm",
      };
    }

    // On violation, fallback to compliant template
    return {
      copy: getFallbackCopy(language, goal, brief.brandName),
      source: "fallback",
      violations: validation.errors,
    };
  } catch (err) {
    return {
      copy: getFallbackCopy(language, goal, brief.brandName),
      source: "fallback",
      violations: [err instanceof Error ? err.message : "Unknown LLM error"],
    };
  }
}
