export * from "./types";
export * from "./simulated";
export * from "./real";

import { AdSenseProvider } from "./types";
import { SimulatedAdSenseProvider } from "./simulated";
import { RealGoogleAdSenseProvider } from "./real";

let cachedProvider: AdSenseProvider | null = null;

export function getAdSenseProvider(forceMode?: "live" | "simulated"): AdSenseProvider {
  const mode = forceMode || (process.env.GOOGLE_ADSENSE_MODE === "live" ? "live" : "simulated");

  if (mode === "live") {
    if (!cachedProvider || !(cachedProvider instanceof RealGoogleAdSenseProvider)) {
      cachedProvider = new RealGoogleAdSenseProvider();
    }
    return cachedProvider;
  }

  if (!cachedProvider || !(cachedProvider instanceof SimulatedAdSenseProvider)) {
    cachedProvider = new SimulatedAdSenseProvider();
  }
  return cachedProvider;
}
