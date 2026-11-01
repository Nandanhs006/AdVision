import { TasteProfile, StyleSpec, Palette, LayoutArchetype, Motif, TypeStyle } from "../schema";
import tasteStyleMapData from "@/data/taste-style-map.json";

export interface StyleRule {
  id: string;
  keywords: string[];
  palette: Palette;
  typeStyle: TypeStyle;
  layout: LayoutArchetype;
  motif: Motif;
  tone: string[];
  energy: number;
}

export interface ScoredRule {
  rule: StyleRule;
  score: number;
  matchedTags: Array<{ name: string; weight: number }>;
}

export interface TasteStyleOutput {
  primary: { style: StyleSpec; reasons: string[] };
  contrast: { style: StyleSpec; reasons: string[] };
  safe: { style: StyleSpec; reasons: string[] };
}

/**
 * Deterministic string hash for stable tie-breaking
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Maps a Qloo taste profile into deterministic design tokens and style variants
 */
export function mapTasteToStyle(
  profile: TasteProfile,
  cohortId = "default-cohort",
  paletteOverride?: Palette
): TasteStyleOutput {
  const rules = tasteStyleMapData.rules as StyleRule[];
  const defaultRule = tasteStyleMapData.default as StyleRule;

  // 1. Score each rule by summed weight of matching Qloo tags
  const scoredRules: ScoredRule[] = rules.map((rule) => {
    let score = 0;
    const matchedTags: Array<{ name: string; weight: number }> = [];

    for (const tag of profile.topTags) {
      const tagNameLower = tag.name.toLowerCase();
      const matched = rule.keywords.some((kw) => {
        const kwLower = kw.toLowerCase();
        return (
          tagNameLower === kwLower ||
          tagNameLower.includes(kwLower) ||
          kwLower.includes(tagNameLower)
        );
      });

      if (matched) {
        score += tag.weight;
        matchedTags.push({ name: tag.name, weight: tag.weight });
      }
    }

    return { rule, score, matchedTags };
  });

  // 2. Sort by score descending; break ties by hashing cohortId + rule.id
  scoredRules.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) {
      return b.score - a.score;
    }
    const hashA = hashString(`${cohortId}:${a.rule.id}`);
    const hashB = hashString(`${cohortId}:${b.rule.id}`);
    return hashB - hashA;
  });

  const bestMatch = scoredRules[0]?.score > 0 ? scoredRules[0] : null;

  // 3. Assemble Primary Variant
  const primaryRule = bestMatch ? bestMatch.rule : defaultRule;
  const primaryPalette: Palette = paletteOverride || primaryRule.palette;

  const primaryReasons: string[] = [];
  if (bestMatch && bestMatch.matchedTags.length > 0) {
    const topMatches = bestMatch.matchedTags
      .slice(0, 3)
      .map((t) => `'${t.name}' (weight: ${t.weight})`)
      .join(", ");
    primaryReasons.push(
      `Palette (${primaryPalette.bg}/${primaryPalette.accent}) and '${primaryRule.layout}' layout selected from Qloo taste signals: ${topMatches}.`
    );
    primaryReasons.push(
      `Motif '${primaryRule.motif}' and '${primaryRule.typeStyle}' typography align with cohort tone: ${primaryRule.tone.join(", ")}.`
    );
  } else {
    primaryReasons.push(
      `Default high-legibility geometric tokens applied (no direct tag match exceeded threshold).`
    );
  }

  const primaryStyle: StyleSpec = {
    palette: primaryPalette,
    typeStyle: primaryRule.typeStyle,
    layout: primaryRule.layout,
    motif: primaryRule.motif,
    tone: primaryRule.tone,
    energy: primaryRule.energy,
  };

  // 4. Assemble Contrast Variant
  // Find second-ranked rule with a differing layout archetype or palette
  const contrastCandidate = scoredRules.find(
    (sr) =>
      sr.rule.id !== primaryRule.id &&
      sr.rule.layout !== primaryRule.layout
  ) || scoredRules[1] || { rule: defaultRule, score: 0, matchedTags: [] };

  const contrastRule = contrastCandidate.rule;
  const contrastPalette: Palette = paletteOverride
    ? {
        bg: paletteOverride.fg === "#ffffff" ? "#121214" : paletteOverride.bg,
        fg: paletteOverride.fg,
        accent: paletteOverride.accent,
      }
    : contrastRule.palette;

  const contrastReasons: string[] = [
    `Alternative creative angle: contrasting '${contrastRule.layout}' layout with '${contrastRule.motif}' motif.`,
  ];
  if (contrastCandidate.matchedTags.length > 0) {
    const contrastTags = contrastCandidate.matchedTags
      .slice(0, 2)
      .map((t) => `'${t.name}' (wt: ${t.weight})`)
      .join(", ");
    contrastReasons.push(`Supported by secondary Qloo affinities: ${contrastTags}.`);
  }

  const contrastStyle: StyleSpec = {
    palette: contrastPalette,
    typeStyle: contrastRule.typeStyle,
    layout: contrastRule.layout,
    motif: contrastRule.motif,
    tone: contrastRule.tone,
    energy: contrastRule.energy,
  };

  // 5. Assemble Safe / Neutral Variant
  const safeStyle: StyleSpec = {
    palette: paletteOverride || {
      bg: "#18181b",
      fg: "#fafafa",
      accent: "#3b82f6",
    },
    typeStyle: "geometric-sans",
    layout: "minimal-center",
    motif: "grid",
    tone: ["clear", "reliable", "approachable"],
    energy: 0.45,
  };
  const safeReasons: string[] = [
    `Safe fallback: high-contrast minimal-center layout engineered for universal legibility across all viewer segments.`,
  ];

  return {
    primary: { style: primaryStyle, reasons: primaryReasons },
    contrast: { style: contrastStyle, reasons: contrastReasons },
    safe: { style: safeStyle, reasons: safeReasons },
  };
}
