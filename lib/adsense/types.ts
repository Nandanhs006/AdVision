export interface AdSenseAccount {
  publisherId: string;
  displayName: string;
  status: "active" | "pending_verification" | "suspended";
  currency: string;
  isSimulated: boolean;
  activeAdUnitsCount: number;
  totalEarnings30dUsd: number;
  averageEcpmUsd: number;
}

export interface AdSenseAdUnit {
  id: string;
  name: string;
  format: "in-scene-billboard" | "responsive-quad" | "transit-gantry" | "storefront-display";
  dimensions: { width: number; height: number };
  status: "active" | "paused" | "archived";
  zoneMapping?: string;
  impressions7d: number;
  clicks7d: number;
  ctr: number;
  ecpmUsd: number;
}

export interface AdSenseBidRequest {
  zoneId: string;
  surfaceLabel: string;
  frameShare: number;
  viewerCity: string;
  viewerCountry: string;
  viewerLanguage: string;
  intentSignals: string[];
  sceneMood: string[];
  floorPriceUsd?: number;
}

export interface AdSenseBidResponse {
  bidId: string;
  adUnitId: string;
  campaignId: string;
  brandName: string;
  category: string;
  headline: string;
  ctaText: string;
  eCPM: number;
  intentScore: number;
  adNetwork: "google_adsense" | "google_ad_manager";
  attribution: string;
  winningBidUsd: number;
  status: "won" | "outbid" | "no_bid";
  timestamp: string;
}

export interface AdSenseProvider {
  getAccount(): Promise<AdSenseAccount>;
  listAdUnits(): Promise<AdSenseAdUnit[]>;
  runAuction(request: AdSenseBidRequest): Promise<AdSenseBidResponse>;
  connect(publisherId: string, clientSecret?: string): Promise<AdSenseAccount>;
}
