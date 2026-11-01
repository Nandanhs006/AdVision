import {
  Connection,
  AdCreative,
  PublishJob,
  Cohort,
  AdCreativeStatus,
} from "../schema";

export interface ImageStore {
  saveImage(buffer: Buffer, filename: string, mimeType?: string): Promise<string>;
}

export interface ConnectionsRepository {
  list(): Promise<Connection[]>;
  get(id: string): Promise<Connection | null>;
  upsert(connection: Connection): Promise<Connection>;
  delete(id: string): Promise<boolean>;
}

export interface CreativesRepository {
  list(campaignId?: string): Promise<AdCreative[]>;
  get(id: string): Promise<AdCreative | null>;
  upsert(creative: AdCreative): Promise<AdCreative>;
  updateStatus(id: string, status: AdCreativeStatus): Promise<AdCreative | null>;
}

export interface PublishJobsRepository {
  list(creativeId?: string): Promise<PublishJob[]>;
  get(id: string): Promise<PublishJob | null>;
  create(job: PublishJob): Promise<PublishJob>;
  update(id: string, partial: Partial<PublishJob>): Promise<PublishJob | null>;
}

export interface CohortsRepository {
  list(): Promise<Cohort[]>;
  get(id: string): Promise<Cohort | null>;
  upsert(cohort: Cohort): Promise<Cohort>;
}
