import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimulatedProvider } from "../lib/meta/simulated";
import { MetaProvider } from "../lib/meta/real";
import { AdCreative, Connection } from "../lib/schema";
import { PublishTarget } from "../lib/meta/types";
import { encryptToken } from "../lib/crypto";

describe("Ad Studio: Meta Provider & Social Integration", () => {
  const dummyCreative: AdCreative = {
    id: "creative-test-01",
    campaignId: "camp-01",
    cohortId: "cohort-01",
    variant: "primary",
    aspect: "1:1",
    style: {
      palette: { bg: "#000", fg: "#fff", accent: "#38bdf8" },
      typeStyle: "geometric-sans",
      layout: "minimal-center",
      motif: "waves",
      tone: ["modern"],
      energy: 0.5,
    },
    copy: {
      headline: "Headline",
      body: "Body copy.",
      cta: "Learn More",
      caption: "Caption #Tag1 #Tag2 #Tag3",
      altText: "Alt text",
    },
    imageUrl: "https://advision.test/rendered-ads/creative-test-01.png",
    trace: [],
    styleReasons: [],
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("SimulatedProvider", () => {
    const provider = new SimulatedProvider("http://localhost:3000");

    it("should return valid simulated connect URL and handle callback", async () => {
      const url = await provider.connectUrl("instagram", "state_csrf_123");
      expect(url).toContain("/api/meta/callback");
      expect(url).toContain("provider=instagram");

      const conn = await provider.handleCallback("sim_code", "state_csrf_123", "instagram");
      expect(conn.mode).toBe("simulated");
      expect(conn.provider).toBe("instagram");
      expect(conn.tokenEnc).toBeTruthy();
    });

    it("should list simulated publish targets", async () => {
      const conn = await provider.handleCallback("sim_code", "state_123", "facebook");
      const targets = await provider.listTargets(conn);

      expect(targets.length).toBeGreaterThan(0);
      expect(targets[0].isSimulated).toBe(true);
      expect(targets[0].provider).toBe("facebook");
    });

    it("should execute simulated publish with simulated: true flag", async () => {
      const conn = await provider.handleCallback("sim_code", "state_123", "instagram");
      const target: PublishTarget = {
        id: "target-sim-ig",
        name: "@advision.studio",
        provider: "instagram",
        isSimulated: true,
      };

      const result = await provider.publish(dummyCreative, target, conn);
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.status).toBe("simulated");
      expect(result.externalPostId).toContain("sim_ig_post_");
    });
  });

  describe("MetaProvider with Mocked Fetch", () => {
    const metaProvider = new MetaProvider({
      appId: "mock_app_123",
      appSecret: "mock_secret_abc",
      redirectUri: "http://localhost:3000/api/meta/callback",
    });

    it("should generate correct OAuth connect URL with requested minimal scopes", async () => {
      const fbUrl = await metaProvider.connectUrl("facebook", "csrf_state_456");
      expect(fbUrl).toContain("client_id=mock_app_123");
      expect(fbUrl).toContain("state=csrf_state_456");
      expect(fbUrl).toContain("pages_manage_posts");

      const igUrl = await metaProvider.connectUrl("instagram", "csrf_state_456");
      expect(igUrl).toContain("instagram_content_publish");
    });

    it("should handle token exchange failure cleanly", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Invalid authorization code" } }),
      });

      await expect(
        metaProvider.handleCallback("invalid_code", "csrf_state_456", "facebook")
      ).rejects.toThrow("Invalid authorization code");
    });

    it("should execute Facebook photo publish via Graph API", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "photo_100293", post_id: "page_post_88301" }),
      });

      const liveConn: Connection = {
        id: "conn-live-fb",
        provider: "facebook",
        mode: "live",
        displayName: "Live FB Page",
        externalId: "page_123",
        scopes: ["pages_manage_posts"],
        tokenEnc: encryptToken("live_meta_page_token"),
        createdAt: new Date().toISOString(),
      };

      const target: PublishTarget = {
        id: "target-live-fb",
        name: "Test Brand Page",
        provider: "facebook",
        pageId: "page_123",
        isSimulated: false,
      };

      const result = await metaProvider.publish(dummyCreative, target, liveConn);
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.externalPostId).toBe("page_post_88301");
    });

    it("should execute Instagram two-step container flow", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes("/media_publish")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ id: "ig_post_published_99182" }),
          });
        }
        if (url.includes("status_code")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ status_code: "FINISHED" }),
          });
        }
        // Container creation
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: "container_media_id_7781" }),
        });
      });

      const liveConn: Connection = {
        id: "conn-live-ig",
        provider: "instagram",
        mode: "live",
        displayName: "@live_brand",
        externalId: "ig_user_123",
        scopes: ["instagram_content_publish"],
        tokenEnc: encryptToken("live_meta_ig_token"),
        createdAt: new Date().toISOString(),
      };

      const target: PublishTarget = {
        id: "target-live-ig",
        name: "@live_brand",
        provider: "instagram",
        igUserId: "ig_user_123",
        isSimulated: false,
      };

      const result = await metaProvider.publish(dummyCreative, target, liveConn);
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.externalPostId).toBe("ig_post_published_99182");
      expect(callCount).toBe(3); // Container -> Poll -> Publish
    });
  });
});
