import { Connection, AdCreative } from "../schema";

export interface PublishTarget {
  id: string;
  name: string;
  provider: "facebook" | "instagram";
  pageId?: string;
  igUserId?: string;
  isSimulated: boolean;
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  simulated: boolean;
  status: "published" | "simulated" | "failed";
  error?: string;
  remainingQuota?: number;
}

export interface QuotaInfo {
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
}

export interface SocialProvider {
  connectUrl(provider: "facebook" | "instagram", state: string): Promise<string>;
  handleCallback(
    code: string,
    state: string,
    provider: "facebook" | "instagram"
  ): Promise<Connection>;
  listTargets(connection: Connection): Promise<PublishTarget[]>;
  publish(
    creative: AdCreative,
    target: PublishTarget,
    connection: Connection
  ): Promise<PublishResult>;
  checkQuota?(
    target: PublishTarget,
    connection: Connection
  ): Promise<QuotaInfo>;
}
