import type { GatewayMode, ProviderId } from "../types";
import type { MaybePromise } from "../storage/maybe-promise";
import type { OrgPolicy } from "./org-policy-service";
import type { ProviderCapability } from "./capability-registry-service";
import type { PurposePolicy, UserConsentRecord } from "./consent-purpose-service";

export interface OrgPolicyRecord extends OrgPolicy {}

export interface UpsertOrgPolicyInput {
  orgId: string;
  defaultMode: GatewayMode;
  allowBringYourOwnKey: boolean;
  allowPlatformManagedKeys: boolean;
  allowedProviders: ProviderId[];
  allowAuditView: boolean;
  requireExternalOptIn: boolean;
  updatedAt: string;
}

export interface UpsertCapabilityInput {
  orgId: string;
  provider: ProviderId;
  modelId: string;
  enabled: boolean;
  supportsText: boolean;
  supportsImages: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  maxMode: GatewayMode;
  updatedAt: string;
}

export interface UpsertPurposePolicyInput {
  orgId: string;
  purpose: string;
  allowLocal: boolean;
  allowExternal: boolean;
  requireUserConsent: boolean;
  requireHumanApproval: boolean;
  updatedAt: string;
}

export interface UpsertUserConsentInput {
  username: string;
  orgId: string;
  purpose: string;
  consentGranted: boolean;
  updatedAt: string;
}

export interface PolicyRepository {
  upsertOrgPolicy(input: UpsertOrgPolicyInput): MaybePromise<void>;
  getOrgPolicy(orgId: string): MaybePromise<OrgPolicyRecord | undefined>;
  listOrgPolicies(): MaybePromise<OrgPolicyRecord[]>;
  upsertCapability(input: UpsertCapabilityInput): MaybePromise<void>;
  listCapabilities(orgId: string): MaybePromise<ProviderCapability[]>;
  upsertPurposePolicy(input: UpsertPurposePolicyInput): MaybePromise<void>;
  listPurposePolicies(orgId: string): MaybePromise<PurposePolicy[]>;
  upsertUserConsent(input: UpsertUserConsentInput): MaybePromise<void>;
  getUserConsent(username: string, orgId: string, purpose: string): MaybePromise<UserConsentRecord | undefined>;
}
