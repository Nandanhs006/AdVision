export * from "./types";
export * from "./simulated";
export * from "./real";

import { SocialProvider } from "./types";
import { SimulatedProvider } from "./simulated";
import { MetaProvider } from "./real";

let cachedLiveProvider: MetaProvider | null = null;
let cachedSimulatedProvider: SimulatedProvider | null = null;

export function getSocialProvider(forcedMode?: "live" | "simulated"): SocialProvider {
  const mode = forcedMode || (process.env.META_MODE === "live" ? "live" : "simulated");

  if (mode === "live") {
    if (!cachedLiveProvider) {
      cachedLiveProvider = new MetaProvider();
    }
    return cachedLiveProvider;
  }

  if (!cachedSimulatedProvider) {
    cachedSimulatedProvider = new SimulatedProvider();
  }
  return cachedSimulatedProvider;
}
