import { Connection, AdCreative } from "../schema";
import { SocialProvider, PublishTarget, PublishResult, QuotaInfo } from "./types";
import { encryptToken } from "../crypto";

export class SimulatedProvider implements SocialProvider {
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async connectUrl(provider: "facebook" | "instagram", state: string): Promise<string> {
    // Returns direct local callback link for simulated demo auth flow
    return `${this.baseUrl}/api/meta/callback?code=sim_auth_code_${Date.now()}&state=${encodeURIComponent(
      state
    )}&provider=${provider}`;
  }

  async handleCallback(
    code: string,
    state: string,
    provider: "facebook" | "instagram"
  ): Promise<Connection> {
    void code;
    void state;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 86400 * 1000).toISOString();

    if (provider === "facebook") {
      return {
        id: `conn-sim-fb-${Date.now()}`,
        provider: "facebook",
        mode: "simulated",
        displayName: "Advision Demo Facebook Page",
        externalId: "act_sim_fb_8829102",
        scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
        tokenEnc: encryptToken("simulated_facebook_token_demo"),
        expiresAt,
        createdAt: now.toISOString(),
      };
    }

    return {
      id: `conn-sim-ig-${Date.now()}`,
      provider: "instagram",
      mode: "simulated",
      displayName: "@advision.studio (Demo IG Professional)",
      externalId: "ig_prof_sim_4492019",
      scopes: ["instagram_basic", "instagram_content_publish"],
      tokenEnc: encryptToken("simulated_instagram_token_demo"),
      expiresAt,
      createdAt: now.toISOString(),
    };
  }

  async listTargets(connection: Connection): Promise<PublishTarget[]> {
    if (connection.provider === "facebook") {
      return [
        {
          id: "target-sim-fb-page",
          name: "Advision Demo Brand Page",
          provider: "facebook",
          pageId: "page_sim_1002348",
          isSimulated: true,
        },
      ];
    }

    return [
      {
        id: "target-sim-ig-prof",
        name: "@advision.studio (Professional Account)",
        provider: "instagram",
        igUserId: "ig_user_sim_991823",
        isSimulated: true,
      },
    ];
  }

  async checkQuota(
    target: PublishTarget,
    connection: Connection
  ): Promise<QuotaInfo> {
    void target;
    void connection;
    return {
      quotaTotal: 50,
      quotaUsed: 3,
      quotaRemaining: 47,
    };
  }

  async publish(
    creative: AdCreative,
    target: PublishTarget,
    connection: Connection
  ): Promise<PublishResult> {
    void connection;
    // Simulate brief container creation & publishing workflow
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const prefix = target.provider === "facebook" ? "sim_fb_post_" : "sim_ig_post_";

    return {
      success: true,
      externalPostId: `${prefix}${randomSuffix}`,
      simulated: true,
      status: "simulated",
      remainingQuota: 46,
    };
  }
}
