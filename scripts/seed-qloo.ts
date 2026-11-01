import fs from "fs";
import path from "path";
import { QlooClient } from "../lib/qloo/client";
import { Campaign } from "../lib/schema";

async function seedQloo() {
  console.log("Starting Qloo entity resolution for campaigns catalog...");

  const dataDir = path.resolve(__dirname, "../data");
  const campaignsFile = path.join(dataDir, "campaigns.json");
  const outputFile = path.join(dataDir, "campaigns.resolved.json");

  const rawData = fs.readFileSync(campaignsFile, "utf-8");
  const campaigns: Campaign[] = JSON.parse(rawData);

  const client = new QlooClient({
    mode: process.env.QLOO_API_KEY ? "live" : "fixture",
  });

  const resolvedCampaigns: Campaign[] = [];

  for (const camp of campaigns) {
    if (camp.publicService) {
      resolvedCampaigns.push(camp);
      continue;
    }

    try {
      console.log(`Resolving entity for "${camp.brandName}"...`);
      const searchRes = await client.search(camp.brandName, ["urn:entity:brand"], 1);
      const topResult = searchRes.results?.[0];

      if (topResult && topResult.id) {
        console.log(`  ✓ Resolved "${camp.brandName}" -> ${topResult.id}`);
        resolvedCampaigns.push({
          ...camp,
          qlooEntityId: topResult.id,
        });
      } else {
        console.log(`  ⚠ No entity found for "${camp.brandName}", falling back to tag matching.`);
        resolvedCampaigns.push({
          ...camp,
          qlooEntityId: `urn:entity:brand:${camp.brandName.toLowerCase().replace(/\s+/g, "_")}`,
        });
      }
    } catch (err) {
      console.error(`  ✗ Error resolving "${camp.brandName}":`, err);
      resolvedCampaigns.push(camp);
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(resolvedCampaigns, null, 2), "utf-8");
  console.log(`\nSuccessfully wrote ${resolvedCampaigns.length} resolved campaigns to ${outputFile}!`);
}

seedQloo().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
