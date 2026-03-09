import { SqliteService } from "../storage/sqlite";
import type { GatewayMode, ProviderId } from "../types";
import type { ProviderCapability } from "./capability-registry-service";
import type { PurposePolicy, UserConsentRecord } from "./consent-purpose-service";
import type { OrgPolicy } from "./org-policy-service";
import {
  PolicyRepository,
  UpsertCapabilityInput,
  UpsertOrgPolicyInput,
  UpsertPurposePolicyInput,
  UpsertUserConsentInput
} from "./policy-repository";

export class SqlitePolicyRepository implements PolicyRepository {
  constructor(private readonly sqlite: SqliteService) {}

  upsertOrgPolicy(input: UpsertOrgPolicyInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO org_policies (
          org_id,
          default_mode,
          allow_bring_your_own_key,
          allow_platform_managed_keys,
          allowed_providers_json,
          allow_audit_view,
          require_external_opt_in,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(org_id) DO UPDATE SET
          default_mode = excluded.default_mode,
          allow_bring_your_own_key = excluded.allow_bring_your_own_key,
          allow_platform_managed_keys = excluded.allow_platform_managed_keys,
          allowed_providers_json = excluded.allowed_providers_json,
          allow_audit_view = excluded.allow_audit_view,
          require_external_opt_in = excluded.require_external_opt_in,
          updated_at = excluded.updated_at
      `)
      .run(
        input.orgId,
        input.defaultMode,
        input.allowBringYourOwnKey ? 1 : 0,
        input.allowPlatformManagedKeys ? 1 : 0,
        JSON.stringify(input.allowedProviders),
        input.allowAuditView ? 1 : 0,
        input.requireExternalOptIn ? 1 : 0,
        input.updatedAt
      );
  }

  getOrgPolicy(orgId: string): OrgPolicy | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT *
        FROM org_policies
        WHERE org_id = ?
      `)
      .get(orgId) as
      | {
          org_id: string;
          default_mode: GatewayMode;
          allow_bring_your_own_key: number;
          allow_platform_managed_keys: number;
          allowed_providers_json: string;
          allow_audit_view: number;
          require_external_opt_in: number;
          updated_at: string;
        }
      | undefined;

    return row ? mapOrgPolicy(row) : undefined;
  }

  listOrgPolicies(): OrgPolicy[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT *
        FROM org_policies
        ORDER BY org_id ASC
      `)
      .all() as Array<{
        org_id: string;
        default_mode: GatewayMode;
        allow_bring_your_own_key: number;
        allow_platform_managed_keys: number;
        allowed_providers_json: string;
        allow_audit_view: number;
        require_external_opt_in: number;
        updated_at: string;
      }>;

    return rows.map(mapOrgPolicy);
  }

  upsertCapability(input: UpsertCapabilityInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO org_provider_capabilities (
          org_id, provider, model_id, enabled,
          supports_text, supports_images, supports_tools, supports_reasoning,
          max_mode, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(org_id, provider, model_id) DO UPDATE SET
          enabled = excluded.enabled,
          supports_text = excluded.supports_text,
          supports_images = excluded.supports_images,
          supports_tools = excluded.supports_tools,
          supports_reasoning = excluded.supports_reasoning,
          max_mode = excluded.max_mode,
          updated_at = excluded.updated_at
      `)
      .run(
        input.orgId,
        input.provider,
        input.modelId,
        input.enabled ? 1 : 0,
        input.supportsText ? 1 : 0,
        input.supportsImages ? 1 : 0,
        input.supportsTools ? 1 : 0,
        input.supportsReasoning ? 1 : 0,
        input.maxMode,
        input.updatedAt
      );
  }

  listCapabilities(orgId: string): ProviderCapability[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT *
        FROM org_provider_capabilities
        WHERE org_id = ?
        ORDER BY provider ASC, model_id ASC
      `)
      .all(orgId) as Array<{
        org_id: string;
        provider: ProviderId;
        model_id: string;
        enabled: number;
        supports_text: number;
        supports_images: number;
        supports_tools: number;
        supports_reasoning: number;
        max_mode: GatewayMode;
        updated_at: string;
      }>;

    return rows.map((row) => ({
      orgId: row.org_id,
      provider: row.provider,
      modelId: row.model_id,
      enabled: Boolean(row.enabled),
      supportsText: Boolean(row.supports_text),
      supportsImages: Boolean(row.supports_images),
      supportsTools: Boolean(row.supports_tools),
      supportsReasoning: Boolean(row.supports_reasoning),
      maxMode: row.max_mode,
      updatedAt: row.updated_at
    }));
  }

  upsertPurposePolicy(input: UpsertPurposePolicyInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO org_purpose_policies (
          org_id, purpose, allow_local, allow_external,
          require_user_consent, require_human_approval, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(org_id, purpose) DO UPDATE SET
          allow_local = excluded.allow_local,
          allow_external = excluded.allow_external,
          require_user_consent = excluded.require_user_consent,
          require_human_approval = excluded.require_human_approval,
          updated_at = excluded.updated_at
      `)
      .run(
        input.orgId,
        input.purpose,
        input.allowLocal ? 1 : 0,
        input.allowExternal ? 1 : 0,
        input.requireUserConsent ? 1 : 0,
        input.requireHumanApproval ? 1 : 0,
        input.updatedAt
      );
  }

  listPurposePolicies(orgId: string): PurposePolicy[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT *
        FROM org_purpose_policies
        WHERE org_id = ?
        ORDER BY purpose ASC
      `)
      .all(orgId) as Array<{
        org_id: string;
        purpose: string;
        allow_local: number;
        allow_external: number;
        require_user_consent: number;
        require_human_approval: number;
        updated_at: string;
      }>;

    return rows.map((row) => ({
      orgId: row.org_id,
      purpose: row.purpose,
      allowLocal: Boolean(row.allow_local),
      allowExternal: Boolean(row.allow_external),
      requireUserConsent: Boolean(row.require_user_consent),
      requireHumanApproval: Boolean(row.require_human_approval),
      updatedAt: row.updated_at
    }));
  }

  upsertUserConsent(input: UpsertUserConsentInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO user_consents (
          username, org_id, purpose, consent_granted, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(username, org_id, purpose) DO UPDATE SET
          consent_granted = excluded.consent_granted,
          updated_at = excluded.updated_at
      `)
      .run(
        input.username,
        input.orgId,
        input.purpose,
        input.consentGranted ? 1 : 0,
        input.updatedAt
      );
  }

  getUserConsent(username: string, orgId: string, purpose: string): UserConsentRecord | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT *
        FROM user_consents
        WHERE username = ? AND org_id = ? AND purpose = ?
      `)
      .get(username, orgId, purpose) as
      | {
          username: string;
          org_id: string;
          purpose: string;
          consent_granted: number;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      username: row.username,
      orgId: row.org_id,
      purpose: row.purpose,
      consentGranted: Boolean(row.consent_granted),
      updatedAt: row.updated_at
    };
  }
}

function mapOrgPolicy(row: {
  org_id: string;
  default_mode: GatewayMode;
  allow_bring_your_own_key: number;
  allow_platform_managed_keys: number;
  allowed_providers_json: string;
  allow_audit_view: number;
  require_external_opt_in: number;
  updated_at: string;
}): OrgPolicy {
  return {
    orgId: row.org_id,
    defaultMode: row.default_mode,
    allowBringYourOwnKey: Boolean(row.allow_bring_your_own_key),
    allowPlatformManagedKeys: Boolean(row.allow_platform_managed_keys),
    allowedProviders: JSON.parse(row.allowed_providers_json) as ProviderId[],
    allowAuditView: Boolean(row.allow_audit_view),
    requireExternalOptIn: Boolean(row.require_external_opt_in),
    updatedAt: row.updated_at
  };
}
