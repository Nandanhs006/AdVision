import {
  IntentEngineClient,
  getIntentClient,
  resetIntentClient,
  IntentSearchResponse,
  IntentInsightsResponse,
  IntentTagsResponse,
  IntentCompareResponse,
} from "../intent/client";

export * from "../intent/client";

// Backward compatibility aliases
export const QlooClient = IntentEngineClient;
export type QlooClient = IntentEngineClient;
export const getQlooClient = getIntentClient;
export const resetQlooClient = resetIntentClient;

export type {
  IntentSearchResponse as QlooSearchResponse,
  IntentInsightsResponse as QlooInsightsResponse,
  IntentTagsResponse as QlooTagsResponse,
  IntentCompareResponse as QlooCompareResponse,
};
