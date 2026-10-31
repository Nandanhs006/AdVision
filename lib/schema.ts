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
  qlooEntityId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  countries: z.array(z.string()).optional(),
  languages: z.array(z.string()).default(["en"]),
  flight: FlightSchema,
  headline: z.record(z.string()),
  cta: z.record(z.string()),
  palette: PaletteSchema,
  publicService: z.boolean().default(false),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const QlooTraceEntrySchema = z.object({
  endpoint: z.string(),
  params: z.record(z.unknown()), // redacted
  status: z.number(),
  ms: z.number(),
  cached: z.boolean(),
});
export type QlooTraceEntry = z.infer<typeof QlooTraceEntrySchema>;

export const RankedCampaignSchema = z.object({
  campaignId: z.string(),
  brandName: z.string().optional(),
  category: z.string().optional(),
  qlooAffinity: z.number(), // 0 to 1
  finalScore: z.number().optional(),
  status: z.enum([
    "selected",
    "allowed",
    "capped",
    "blocked",
    "expired",
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
  trace: z.array(QlooTraceEntrySchema),
  explanation: z.string(),
  source: z.enum(["qloo", "fixture", "fallback"]),
  status: z.enum(["approved", "pending", "bypassed"]).default("approved"),
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
