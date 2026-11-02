import {
  AdSenseAccount,
  AdSenseAdUnit,
  AdSenseBidRequest,
  AdSenseBidResponse,
  AdSenseProvider,
} from "./types";

export class SimulatedAdSenseProvider implements AdSenseProvider {
  private publisherId: string;

  constructor(publisherId = "pub-9482-1048-2847") {
    this.publisherId = publisherId;
  }

  async getAccount(): Promise<AdSenseAccount> {
    return {
      publisherId: this.publisherId,
      displayName: "SceneCast In-Scene Media Network (Google AdSense Partner)",
      status: "active",
      currency: "USD",
      isSimulated: true,
      activeAdUnitsCount: 4,
      totalEarnings30dUsd: 14280.5,
      averageEcpmUsd: 12.45,
    };
  }

  async listAdUnits(): Promise<AdSenseAdUnit[]> {
    return [
      {
        id: "adsense-unit-broadway-tower",
        name: "Times Square Broadway Tower Mega-Billboard",
        format: "in-scene-billboard",
        dimensions: { width: 1920, height: 1080 },
        status: "active",
        zoneMapping: "zone-billboard-broadway",
        impressions7d: 142500,
        clicks7d: 4120,
        ctr: 0.0289,
        ecpmUsd: 16.8,
      },
      {
        id: "adsense-unit-chicago-gantry",
        name: "Kennedy Expressway In-Scene Super-Gantry",
        format: "transit-gantry",
        dimensions: { width: 1200, height: 600 },
        status: "active",
        zoneMapping: "zone-chicago-expressway",
        impressions7d: 89400,
        clicks7d: 1980,
        ctr: 0.0221,
        ecpmUsd: 13.5,
      },
      {
        id: "adsense-unit-shibuya-screen",
        name: "Shibuya Crossing Pedestrian High-Bright Screen",
        format: "responsive-quad",
        dimensions: { width: 1080, height: 1080 },
        status: "active",
        zoneMapping: "zone-shibuya-led",
        impressions7d: 210000,
        clicks7d: 5800,
        ctr: 0.0276,
        ecpmUsd: 18.2,
      },
      {
        id: "adsense-unit-storefront",
        name: "Downtown Retail Dynamic Storefront Blade",
        format: "storefront-display",
        dimensions: { width: 800, height: 1200 },
        status: "active",
        zoneMapping: "zone-storefront-blade",
        impressions7d: 45000,
        clicks7d: 980,
        ctr: 0.0218,
        ecpmUsd: 9.4,
      },
    ];
  }

  async runAuction(request: AdSenseBidRequest): Promise<AdSenseBidResponse> {
    const { zoneId, intentSignals, sceneMood, viewerCountry } = request;

    // Intent scoring based on commercial keywords and scene atmosphere
    const signalsLower = intentSignals.map((s) => s.toLowerCase());
    const moodLower = sceneMood.map((m) => m.toLowerCase());
    const isTechOrAuto = signalsLower.some(
      (s) =>
        s.includes("auto") ||
        s.includes("car") ||
        s.includes("camera") ||
        s.includes("tech") ||
        s.includes("gaming")
    );
    const isBeverageOrSports = signalsLower.some(
      (s) =>
        s.includes("energy") ||
        s.includes("drink") ||
        s.includes("fitness") ||
        s.includes("sports")
    );

    let winnerBrand = "Sony Alpha";
    let winnerCategory = "electronics";
    let headline = "Capture Every Detail in Low Light";
    let ctaText = "Shop Sony Alpha 7 IV";
    let baseEcpm = 14.8;
    let intentScore = 0.94;

    if (isBeverageOrSports || moodLower.includes("expressway")) {
      winnerBrand = "RepBull Energy";
      winnerCategory = "beverage";
      headline = "Ignite Your Focus";
      ctaText = "Get 20% Off 12-Pack";
      baseEcpm = 17.5;
      intentScore = 0.96;
    } else if (isTechOrAuto || moodLower.includes("transit")) {
      winnerBrand = "MRF Steel Muscle";
      winnerCategory = "automotive";
      headline = "Precision Grip for Wet Expressways";
      ctaText = "Find Nearest Dealer";
      baseEcpm = 15.2;
      intentScore = 0.91;
    }

    // Adjust eCPM with country demand index
    const countryMultiplier = viewerCountry.toLowerCase().includes("united states")
      ? 1.2
      : viewerCountry.toLowerCase().includes("japan")
      ? 1.15
      : 1.0;

    const winningBidUsd = Number((baseEcpm * countryMultiplier).toFixed(2));

    return {
      bidId: `bid-adsense-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      adUnitId: `unit-${zoneId}`,
      campaignId: `camp-${winnerBrand.toLowerCase().replace(/\s+/g, "-")}`,
      brandName: winnerBrand,
      category: winnerCategory,
      headline,
      ctaText,
      eCPM: winningBidUsd,
      intentScore,
      adNetwork: "google_adsense",
      attribution: `Google AdSense RTB Intent Auction (${winnerBrand} @ $${winningBidUsd.toFixed(2)} eCPM)`,
      winningBidUsd,
      status: "won",
      timestamp: new Date().toISOString(),
    };
  }

  async connect(publisherId: string): Promise<AdSenseAccount> {
    this.publisherId = publisherId;
    return this.getAccount();
  }
}
