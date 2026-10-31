import { Campaign, EventLog } from "./schema";
import defaultCampaigns from "@/data/campaigns.json";

// In-Memory IP Rate Limiter: max 10 requests / min
const ipRateMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit = 10, windowMs = 60 * 1000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

// In-Memory Store for campaigns and events (persisted across requests)
let customCampaigns: Campaign[] = [...(defaultCampaigns as Campaign[])];
const eventLogs: EventLog[] = [
  // Seeded realistic events
  {
    id: "evt-1",
    type: "impression",
    campaignId: "camp-kissa-coffee",
    viewerId: "viewer-tokyo",
    zoneId: "zone-rooftop-billboard",
    city: "Tokyo",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "evt-2",
    type: "click",
    campaignId: "camp-kissa-coffee",
    viewerId: "viewer-tokyo",
    zoneId: "zone-rooftop-billboard",
    city: "Tokyo",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "evt-3",
    type: "pause_view",
    campaignId: "camp-malabar-chai",
    viewerId: "viewer-vizag",
    zoneId: "zone-storefront-sign",
    city: "Visakhapatnam",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "evt-4",
    type: "impression",
    campaignId: "camp-malabar-chai",
    viewerId: "viewer-vizag",
    zoneId: "zone-storefront-sign",
    city: "Visakhapatnam",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "evt-5",
    type: "impression",
    campaignId: "camp-lumina-audio",
    viewerId: "viewer-sf",
    zoneId: "zone-rooftop-billboard",
    city: "San Francisco",
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export function getCampaignsCatalog(): Campaign[] {
  return customCampaigns;
}

export function addCampaignToCatalog(campaign: Campaign): void {
  // If exists, replace; else append
  const idx = customCampaigns.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    customCampaigns[idx] = campaign;
  } else {
    customCampaigns.push(campaign);
  }
}

export function logAdEvent(event: Omit<EventLog, "id" | "timestamp">): EventLog {
  const fullEvent: EventLog = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  eventLogs.push(fullEvent);
  return fullEvent;
}

export function getAdEvents(): EventLog[] {
  return [...eventLogs];
}
