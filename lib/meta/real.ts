import { Connection, AdCreative } from "../schema";
import { SocialProvider, PublishTarget, PublishResult, QuotaInfo } from "./types";
import { encryptToken, decryptToken } from "../crypto";

export class MetaProvider implements SocialProvider {
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private graphApiVersion: string;

  constructor(options?: {
    appId?: string;
    appSecret?: string;
    redirectUri?: string;
    graphApiVersion?: string;
  }) {
    this.appId = options?.appId || process.env.META_APP_ID || "";
    this.appSecret = options?.appSecret || process.env.META_APP_SECRET || "";
    this.redirectUri =
      options?.redirectUri ||
      process.env.META_REDIRECT_URI ||
      "http://localhost:3000/api/meta/callback";
    this.graphApiVersion = options?.graphApiVersion || "v21.0";
  }

  async connectUrl(provider: "facebook" | "instagram", state: string): Promise<string> {
    const scopes =
      provider === "facebook"
        ? ["pages_show_list", "pages_read_engagement", "pages_manage_posts"]
        : ["instagram_basic", "instagram_content_publish", "pages_show_list"];

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope: scopes.join(","),
      response_type: "code",
    });

    return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
    provider: "facebook" | "instagram"
  ): Promise<Connection> {
    void state;
    if (!this.appId || !this.appSecret) {
      throw new Error("META_APP_ID or META_APP_SECRET missing in environment");
    }

    // 1. Exchange code for short-lived token
    const tokenUrl = new URL(
      `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`
    );
    tokenUrl.searchParams.set("client_id", this.appId);
    tokenUrl.searchParams.set("client_secret", this.appSecret);
    tokenUrl.searchParams.set("redirect_uri", this.redirectUri);
    tokenUrl.searchParams.set("code", code);

    const res = await fetch(tokenUrl.toString());
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || `OAuth token exchange failed with status ${res.status}`;
      throw new Error(msg);
    }

    const tokenData = await res.json();
    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for long-lived token (60-day validity)
    const longLivedUrl = new URL(
      `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`
    );
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", this.appId);
    longLivedUrl.searchParams.set("client_secret", this.appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = longLivedRes.ok
      ? await longLivedRes.json()
      : { access_token: shortLivedToken, expires_in: 5184000 };

    const token = longLivedData.access_token || shortLivedToken;
    const expiresIn = Number(longLivedData.expires_in || 5184000);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3. Query user profile name
    const meRes = await fetch(
      `https://graph.facebook.com/${this.graphApiVersion}/me?access_token=${token}`
    );
    const meData = meRes.ok ? await meRes.json() : { id: "meta_user", name: "Meta User" };

    const scopes =
      provider === "facebook"
        ? ["pages_show_list", "pages_read_engagement", "pages_manage_posts"]
        : ["instagram_basic", "instagram_content_publish"];

    return {
      id: `conn-meta-${provider}-${Date.now()}`,
      provider,
      mode: "live",
      displayName: `${meData.name || "Meta"} (${provider === "facebook" ? "Page" : "IG"})`,
      externalId: meData.id || `meta_${Date.now()}`,
      scopes,
      tokenEnc: encryptToken(token),
      expiresAt,
      createdAt: new Date().toISOString(),
    };
  }

  async listTargets(connection: Connection): Promise<PublishTarget[]> {
    const rawToken = decryptToken(connection.tokenEnc);
    const targets: PublishTarget[] = [];

    // Query User Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/${this.graphApiVersion}/me/accounts?access_token=${rawToken}`
    );

    if (!pagesRes.ok) {
      const err = await pagesRes.json().catch(() => ({}));
      if (err.error?.code === 190) {
        throw new Error("Meta access token expired. Please reconnect your account.");
      }
      return [];
    }

    const pagesData = await pagesRes.json();
    const pages = Array.isArray(pagesData.data) ? pagesData.data : [];

    for (const page of pages) {
      if (connection.provider === "facebook") {
        targets.push({
          id: `target-fb-${page.id}`,
          name: `${page.name} (Facebook Page)`,
          provider: "facebook",
          pageId: page.id,
          isSimulated: false,
        });
      }

      if (connection.provider === "instagram") {
        // Query linked Instagram professional account
        const igRes = await fetch(
          `https://graph.facebook.com/${this.graphApiVersion}/${page.id}?fields=instagram_business_account{id,username,name}&access_token=${page.access_token || rawToken}`
        );
        if (igRes.ok) {
          const igData = await igRes.json();
          if (igData.instagram_business_account?.id) {
            targets.push({
              id: `target-ig-${igData.instagram_business_account.id}`,
              name: `@${igData.instagram_business_account.username || "instagram_user"} (Linked to ${page.name})`,
              provider: "instagram",
              igUserId: igData.instagram_business_account.id,
              pageId: page.id,
              isSimulated: false,
            });
          }
        }
      }
    }

    return targets;
  }

  async checkQuota(
    target: PublishTarget,
    connection: Connection
  ): Promise<QuotaInfo> {
    if (target.provider !== "instagram" || !target.igUserId) {
      return { quotaTotal: 100, quotaUsed: 0, quotaRemaining: 100 };
    }

    const rawToken = decryptToken(connection.tokenEnc);
    const quotaRes = await fetch(
      `https://graph.facebook.com/${this.graphApiVersion}/${target.igUserId}/content_publishing_limit?fields=quota_usage,config&access_token=${rawToken}`
    );

    if (quotaRes.ok) {
      const json = await quotaRes.json();
      const config = json.config || {};
      const usage = json.quota_usage ?? 0;
      const total = config.quota_total || 50;
      return {
        quotaTotal: total,
        quotaUsed: usage,
        quotaRemaining: Math.max(0, total - usage),
      };
    }

    return { quotaTotal: 50, quotaUsed: 0, quotaRemaining: 50 };
  }

  async publish(
    creative: AdCreative,
    target: PublishTarget,
    connection: Connection
  ): Promise<PublishResult> {
    const rawToken = decryptToken(connection.tokenEnc);

    // 1. Facebook Page Publish
    if (target.provider === "facebook") {
      if (!target.pageId) {
        return {
          success: false,
          simulated: false,
          status: "failed",
          error: "Facebook target is missing Page ID",
        };
      }

      const postUrl = `https://graph.facebook.com/${this.graphApiVersion}/${target.pageId}/photos`;
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: creative.imageUrl,
          caption: creative.copy.caption,
          access_token: rawToken,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          simulated: false,
          status: "failed",
          error: errJson.error?.message || `Facebook publish failed with status ${res.status}`,
        };
      }

      const postData = await res.json();
      return {
        success: true,
        externalPostId: postData.post_id || postData.id,
        simulated: false,
        status: "published",
      };
    }

    // 2. Instagram Professional Publish (Two-Step Media Flow)
    if (!target.igUserId) {
      return {
        success: false,
        simulated: false,
        status: "failed",
        error:
          "Target account is not an Instagram Professional/Business account linked to a Page.",
      };
    }

    // Step A: Create media container
    const containerUrl = `https://graph.facebook.com/${this.graphApiVersion}/${target.igUserId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: creative.imageUrl,
        caption: creative.copy.caption,
        access_token: rawToken,
      }),
    });

    if (!containerRes.ok) {
      const errJson = await containerRes.json().catch(() => ({}));
      return {
        success: false,
        simulated: false,
        status: "failed",
        error: errJson.error?.message || `IG container creation failed with status ${containerRes.status}`,
      };
    }

    const containerData = await containerRes.json();
    const containerId = containerData.id;

    // Step B: Poll container status
    let attempts = 0;
    let isReady = false;
    while (attempts < 5 && !isReady) {
      attempts++;
      const statusRes = await fetch(
        `https://graph.facebook.com/${this.graphApiVersion}/${containerId}?fields=status_code&access_token=${rawToken}`
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") {
          isReady = true;
          break;
        }
        if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") {
          return {
            success: false,
            simulated: false,
            status: "failed",
            error: `Instagram container processing failed: ${statusData.status_code}`,
          };
        }
      }
      // Small pause between polls
      await new Promise((r) => setTimeout(r, 600));
    }

    // Step C: Media Publish
    const publishUrl = `https://graph.facebook.com/${this.graphApiVersion}/${target.igUserId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: rawToken,
      }),
    });

    if (!publishRes.ok) {
      const errJson = await publishRes.json().catch(() => ({}));
      return {
        success: false,
        simulated: false,
        status: "failed",
        error: errJson.error?.message || `Instagram publish failed with status ${publishRes.status}`,
      };
    }

    const publishData = await publishRes.json();
    return {
      success: true,
      externalPostId: publishData.id,
      simulated: false,
      status: "published",
    };
  }
}
