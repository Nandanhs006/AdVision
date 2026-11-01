import {
  Connection,
  AdCreative,
  PublishJob,
  Cohort,
  AdCreativeStatus,
} from "../schema";
import {
  ConnectionsRepository,
  CreativesRepository,
  PublishJobsRepository,
  CohortsRepository,
} from "./types";
import { encryptToken } from "../crypto";

export class InMemoryConnectionsRepository implements ConnectionsRepository {
  private connections = new Map<string, Connection>();

  constructor() {
    // Seed standard simulated connections for instant demo availability
    const simFb: Connection = {
      id: "conn-sim-fb-01",
      provider: "facebook",
      mode: "simulated",
      displayName: "Advision Demo Facebook Page",
      externalId: "act_sim_fb_8829102",
      scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
      tokenEnc: encryptToken("simulated_facebook_page_access_token_mock"),
      expiresAt: new Date(Date.now() + 60 * 86400 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    const simIg: Connection = {
      id: "conn-sim-ig-01",
      provider: "instagram",
      mode: "simulated",
      displayName: "@advision.studio (Demo IG Professional)",
      externalId: "ig_prof_sim_4492019",
      scopes: ["instagram_basic", "instagram_content_publish"],
      tokenEnc: encryptToken("simulated_instagram_graph_token_mock"),
      expiresAt: new Date(Date.now() + 60 * 86400 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.connections.set(simFb.id, simFb);
    this.connections.set(simIg.id, simIg);
  }

  async list(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async get(id: string): Promise<Connection | null> {
    return this.connections.get(id) || null;
  }

  async upsert(connection: Connection): Promise<Connection> {
    this.connections.set(connection.id, connection);
    return connection;
  }

  async delete(id: string): Promise<boolean> {
    return this.connections.delete(id);
  }
}

export class InMemoryCreativesRepository implements CreativesRepository {
  private creatives = new Map<string, AdCreative>();

  async list(campaignId?: string): Promise<AdCreative[]> {
    const all = Array.from(this.creatives.values());
    if (!campaignId) return all;
    return all.filter((c) => c.campaignId === campaignId);
  }

  async get(id: string): Promise<AdCreative | null> {
    return this.creatives.get(id) || null;
  }

  async upsert(creative: AdCreative): Promise<AdCreative> {
    this.creatives.set(creative.id, creative);
    return creative;
  }

  async updateStatus(
    id: string,
    status: AdCreativeStatus
  ): Promise<AdCreative | null> {
    const existing = this.creatives.get(id);
    if (!existing) return null;
    const updated: AdCreative = { ...existing, status };
    this.creatives.set(id, updated);
    return updated;
  }
}

export class InMemoryPublishJobsRepository implements PublishJobsRepository {
  private jobs = new Map<string, PublishJob>();

  async list(creativeId?: string): Promise<PublishJob[]> {
    const all = Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!creativeId) return all;
    return all.filter((j) => j.creativeId === creativeId);
  }

  async get(id: string): Promise<PublishJob | null> {
    return this.jobs.get(id) || null;
  }

  async create(job: PublishJob): Promise<PublishJob> {
    this.jobs.set(job.id, job);
    return job;
  }

  async update(
    id: string,
    partial: Partial<PublishJob>
  ): Promise<PublishJob | null> {
    const existing = this.jobs.get(id);
    if (!existing) return null;
    const updated: PublishJob = { ...existing, ...partial };
    this.jobs.set(id, updated);
    return updated;
  }
}

export class InMemoryCohortsRepository implements CohortsRepository {
  private cohorts = new Map<string, Cohort>();

  constructor() {
    // Seed default sample cohorts for convenience
    const tokyoCohort: Cohort = {
      id: "cohort-tokyo-indie",
      city: "Tokyo",
      country: "Japan",
      language: "ja",
      ageBand: "25-34",
      anchors: ["Haruki Murakami", "Ryuichi Sakamoto", "Daikanyama T-Site", "Blue Bottle Aoyama"],
      goal: "awareness",
    };
    const nycCohort: Cohort = {
      id: "cohort-nyc-creative",
      city: "New York",
      country: "United States",
      language: "en",
      ageBand: "21-30",
      anchors: ["A24", "Tyler The Creator", "Dumbo Brooklyn", "Supreme New York"],
      goal: "traffic",
    };
    this.cohorts.set(tokyoCohort.id!, tokyoCohort);
    this.cohorts.set(nycCohort.id!, nycCohort);
  }

  async list(): Promise<Cohort[]> {
    return Array.from(this.cohorts.values());
  }

  async get(id: string): Promise<Cohort | null> {
    return this.cohorts.get(id) || null;
  }

  async upsert(cohort: Cohort): Promise<Cohort> {
    const id = cohort.id || `cohort-${Date.now()}`;
    const fullCohort = { ...cohort, id };
    this.cohorts.set(id, fullCohort);
    return fullCohort;
  }
}

export const globalConnectionsRepo = new InMemoryConnectionsRepository();
export const globalCreativesRepo = new InMemoryCreativesRepository();
export const globalPublishJobsRepo = new InMemoryPublishJobsRepository();
export const globalCohortsRepo = new InMemoryCohortsRepository();
