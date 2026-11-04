import { z } from "zod";

export const Point2DSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Point2D = z.infer<typeof Point2DSchema>;

export const ViewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  country: z.string(),
  language: z.string(),
  ageBand: z.string(),
  favorites: z.array(z.string()),
  adPreference: z.enum(["normal", "kids", "adfree"]),
});
export type Viewer = z.infer<typeof ViewerSchema>;

export const ZoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  quad: z.array(Point2DSchema).length(4), // normalized 0-1 corners [TL, TR, BR, BL]
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  frameShare: z.number().min(0).max(1), // computed from quad area (0-1)
});
export type Zone = z.infer<typeof ZoneSchema>;

export const RulesSchema = z.object({
  allowedCategories: z.array(z.string()).default([]),
  blockedCategories: z.array(z.string()).default([]),
  prominenceCap: z.number().min(0.05).max(0.6).default(0.35),
  requireApproval: z.boolean().default(false),
  sceneMood: z.array(z.string()).default([]),
});
export type Rules = z.infer<typeof RulesSchema>;

export const FlightSchema = z.object({
  start: z.string(), // ISO date string YYYY-MM-DD
  end: z.string(),   // ISO date string YYYY-MM-DD
});
export type Flight = z.infer<typeof FlightSchema>;

export const PaletteSchema = z.object({
  bg: z.string(),
  fg: z.string(),
  accent: z.string(),
});
export type Palette = z.infer<typeof PaletteSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  brandName: z.string(),
  category: z.string(),
  intentEntityId: z.string().optional(),
  qlooEntityId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  countries: z.array(z.string()).optional(),
  languages: z.array(z.string()).default(["en"]),
  flight: FlightSchema,
  headline: z.record(z.string()),
  cta: z.record(z.string()),
  palette: PaletteSchema,
  publicService: z.boolean().default(false),
  // Part 2 additions
  adCreativeIds: z.array(z.string()).optional(),
  createdInAdStudio: z.boolean().optional(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const DecisionTraceEntrySchema = z.object({
  endpoint: z.string(),
  params: z.record(z.unknown()), // redacted
  status: z.number(),
  ms: z.number(),
  cached: z.boolean(),
});
export type DecisionTraceEntry = z.infer<typeof DecisionTraceEntrySchema>;
export const QlooTraceEntrySchema = DecisionTraceEntrySchema;
export type QlooTraceEntry = DecisionTraceEntry;

export const RankedCampaignSchema = z.object({
  campaignId: z.string(),
  brandName: z.string().optional(),
  category: z.string().optional(),
  intentScore: z.number().optional(), // 0 to 1 intent-based classification score
  qlooAffinity: z.number().optional(), // 0 to 1 (backward compatible)
  adNetwork: z.enum(["meta_audience_network", "meta_ads", "programmatic_dsp", "direct"]).optional(),
  intentSignals: z.array(z.string()).optional(),
  finalScore: z.number().optional(),
  status: z.enum([
    "selected",
    "allowed",
    "capped",
    "blocked",
    "expired",
    "not_in_intent_top",
    "not_in_qloo_top",
    "pending_approval",
  ]),
  reason: z.string(),
});
export type RankedCampaign = z.infer<typeof RankedCampaignSchema>;

export const DecisionSchema = z.object({
  zoneId: z.string(),
  viewerId: z.string(),
  winner: z.union([z.string(), z.literal("neutral"), z.literal("psa")]),
  winningCampaign: CampaignSchema.optional(),
  ranked: z.array(RankedCampaignSchema),
  reasons: z.array(z.string()),
  trace: z.array(DecisionTraceEntrySchema),
  explanation: z.string(),
  source: z.enum(["intent_engine", "meta_audience_network", "meta_ads", "fixture", "fallback", "qloo"]),
  status: z.enum(["approved", "pending", "bypassed"]).default("approved"),
  adNetwork: z.string().optional(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  filmTitle: z.string(),
  videoUrl: z.string(),
  durationSec: z.number(),
  status: z.enum(["live", "review", "draft"]),
  zones: z.array(ZoneSchema),
  rules: RulesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const EventLogSchema = z.object({
  id: z.string(),
  type: z.enum(["impression", "pause_view", "click"]),
  campaignId: z.string(),
  viewerId: z.string(),
  zoneId: z.string(),
  city: z.string(),
  timestamp: z.string(),
});
export type EventLog = z.infer<typeof EventLogSchema>;

// ==========================================
// Part 2: Ad Studio Schemas
// ==========================================

export const CohortSchema = z.object({
  id: z.string().optional(),
  city: z.string().min(1),
  country: z.string().min(1),
  language: z.string().min(2),
  ageBand: z.string().min(1),
  anchors: z.array(z.string()).min(3).max(5), // 3 to 5 free-text favorites
  goal: z.enum(["awareness", "traffic", "sales"]),
});
export type Cohort = z.infer<typeof CohortSchema>;

export const BriefSchema = z.object({
  brandName: z.string().min(1),
  product: z.string().min(1),
  category: z.string().min(1),
  goal: z.enum(["awareness", "traffic", "sales"]),
  languages: z.array(z.string()).default(["en"]),
  paletteOverride: PaletteSchema.optional(),
  price: z.string().optional(),
});
export type Brief = z.infer<typeof BriefSchema>;

export const TasteTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
});
export type TasteTag = z.infer<typeof TasteTagSchema>;

export const TasteEntitySchema = z.object({
  type: z.string(),
  name: z.string(),
  affinity: z.number(),
});
export type TasteEntity = z.infer<typeof TasteEntitySchema>;

export const TasteProfileSchema = z.object({
  topTags: z.array(TasteTagSchema),
  topEntities: z.array(TasteEntitySchema),
  traces: z.array(QlooTraceEntrySchema),
  source: z.enum(["qloo", "fixture", "fallback"]),
});
export type TasteProfile = z.infer<typeof TasteProfileSchema>;

export const TypeStyleSchema = z.enum([
  "geometric-sans",
  "editorial-serif",
  "rounded",
  "condensed-bold",
]);
export type TypeStyle = z.infer<typeof TypeStyleSchema>;

export const LayoutArchetypeSchema = z.enum([
  "minimal-center",
  "bold-type",
  "split-panel",
  "collage-grid",
  "story-vertical",
  "price-badge",
]);
export type LayoutArchetype = z.infer<typeof LayoutArchetypeSchema>;

export const MotifSchema = z.enum([
  "circles",
  "grain",
  "stripes",
  "waves",
  "grid",
]);
export type Motif = z.infer<typeof MotifSchema>;

export const StyleSpecSchema = z.object({
  palette: PaletteSchema,
  typeStyle: TypeStyleSchema,
  layout: LayoutArchetypeSchema,
  motif: MotifSchema,
  tone: z.array(z.string()),
  energy: z.number().min(0).max(1),
});
export type StyleSpec = z.infer<typeof StyleSpecSchema>;

export const AdCopySchema = z.object({
  headline: z.string(), // <= 7 words
  body: z.string(),     // <= 125 chars
  cta: z.string(),      // <= 3 words
  caption: z.string(),  // <= 300 chars, with 3 to 5 hashtags
  altText: z.string(),
});
export type AdCopy = z.infer<typeof AdCopySchema>;

export const AdAspectSchema = z.enum(["1:1", "4:5", "9:16"]);
export type AdAspect = z.infer<typeof AdAspectSchema>;

export const AdVariantSchema = z.enum(["primary", "contrast", "safe"]);
export type AdVariant = z.infer<typeof AdVariantSchema>;

export const AdCreativeStatusSchema = z.enum([
  "draft",
  "approved",
  "published",
  "simulated",
  "failed",
]);
export type AdCreativeStatus = z.infer<typeof AdCreativeStatusSchema>;

// ==========================================
// Part 3: Meta Motion In-Scene Creative Schemas
// (Inspired by brag 3-act beat architecture & Muse Spark)
// ==========================================

export const MotionSceneBeatSchema = z.object({
  act: z.number().min(1).max(3),
  name: z.string(), // "Hook" | "Core Benefit" | "CTA & QR"
  startSec: z.number(),
  durationSec: z.number(),
  headline: z.string(),
  subhead: z.string(),
  visualCue: z.string(),
  motif: MotifSchema,
  sfxCue: z.string().optional(),
});
export type MotionSceneBeat = z.infer<typeof MotionSceneBeatSchema>;

export const MotionAdPlanSchema = z.object({
  campaignId: z.string(),
  brandName: z.string(),
  totalDurationSec: z.number().default(15.0),
  beats: z.array(MotionSceneBeatSchema),
  musicTrack: z.string().default("happy-beats-business-moves-vol-1"),
  bpm: z.number().default(120),
  palette: PaletteSchema,
  qrLink: z.string().default("https://instagram.com/"),
  source: z.enum(["meta_muse_spark", "fallback"]).default("meta_muse_spark"),
  aiModel: z.string().default("Meta Muse Spark + Muse Wonder"),
});
export type MotionAdPlan = z.infer<typeof MotionAdPlanSchema>;

export const AdCreativeSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  cohortId: z.string(),
  variant: AdVariantSchema,
  aspect: AdAspectSchema,
  style: StyleSpecSchema,
  copy: AdCopySchema,
  imageUrl: z.string(),
  trace: z.array(QlooTraceEntrySchema).optional().default([]),
  styleReasons: z.array(z.string()).optional().default([]),
  status: AdCreativeStatusSchema.default("draft"),
  createdAt: z.string(),
});
export type AdCreative = z.infer<typeof AdCreativeSchema>;

export const ConnectionSchema = z.object({
  id: z.string(),
  provider: z.enum(["instagram", "facebook"]),
  mode: z.enum(["live", "simulated"]),
  displayName: z.string(),
  externalId: z.string(),
  scopes: z.array(z.string()),
  tokenEnc: z.string(), // AES-256-GCM encrypted
  expiresAt: z.string().optional(),
  createdAt: z.string(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const PublishJobStatusSchema = z.enum([
  "queued",
  "container_created",
  "published",
  "simulated",
  "failed",
]);
export type PublishJobStatus = z.infer<typeof PublishJobStatusSchema>;

export const PublishJobSchema = z.object({
  id: z.string(),
  creativeId: z.string(),
  connectionId: z.string(),
  provider: z.enum(["instagram", "facebook"]),
  status: PublishJobStatusSchema,
  externalPostId: z.string().optional(),
  error: z.string().optional(),
  simulated: z.boolean(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type PublishJob = z.infer<typeof PublishJobSchema>;
