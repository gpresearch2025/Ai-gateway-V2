import { PostgresService } from "../storage/postgres";
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

export class PostgresPolicyRepository implements PolicyRepository {
  constructor(private readonly postgres: PostgresService) {}

  async upsertOrgPolicy(input: UpsertOrgPolicyInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO org_policies (
          org_id, default_mode, allow_bring_your_own_key, allow_platform_managed_keys,
          allowed_providers_json, allow_audit_view, require_external_opt_in, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(org_id) DO UPDATE SET
          default_mode = excluded.default_mode,
          allow_bring_your_own_key = excluded.allow_bring_your_own_key,
          allow_platform_managed_keys = excluded.allow_platform_managed_keys,
          allowed_providers_json = excluded.allowed_providers_json,
          allow_audit_view = excluded.allow_audit_view,
          require_external_opt_in = excluded.require_external_opt_in,
          updated_at = excluded.updated_at
      `,
      [
        input.orgId,
        input.defaultMode,
        input.allowBringYourOwnKey ? 1 : 0,
        input.allowPlatformManagedKeys ? 1 : 0,
        JSON.stringify(input.allowedProviders),
        input.allowAuditView ? 1 : 0,
        input.requireExternalOptIn ? 1 : 0,
        input.updatedAt
      ]
    );
  }

  async getOrgPolicy(orgId: string): Promise<OrgPolicy | undefined> {
    const result = await this.postgres.pool.query(`SELECT * FROM org_policies WHERE org_id = $1`, [orgId]);
    const row = result.rows[0];
    return row ? mapOrgPolicy(row) : undefined;
  }

  async listOrgPolicies(): Promise<OrgPolicy[]> {
    const result = await this.postgres.pool.query(`SELECT * FROM org_policies ORDER BY org_id ASC`);
    return result.rows.map(mapOrgPolicy);
  }

  async upsertCapability(input: UpsertCapabilityInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO org_provider_capabilities (
          org_id, provider, model_id, enabled, supports_text, supports_images,
          supports_tools, supports_reasoning, max_mode, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT(org_id, provider, model_id) DO UPDATE SET
          enabled = excluded.enabled,
          supports_text = excluded.supports_text,
          supports_images = excluded.supports_images,
          supports_tools = excluded.supports_tools,
          supports_reasoning = excluded.supports_reasoning,
          max_mode = excluded.max_mode,
          updated_at = excluded.updated_at
      `,
      [
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
      ]
    );
  }

  async listCapabilities(orgId: string): Promise<ProviderCapability[]> {
    const result = await this.postgres.pool.query(
      `SELECT * FROM org_provider_capabilities WHERE org_id = $1 ORDER BY provider ASC, model_id ASC`,
      [orgId]
    );
    return result.rows.map((row) => ({
      orgId: String(row.org_id),
      provider: row.provider as ProviderId,
      modelId: String(row.model_id),
      enabled: Boolean(row.enabled),
      supportsText: Boolean(row.supports_text),
      supportsImages: Boolean(row.supports_images),
      supportsTools: Boolean(row.supports_tools),
      supportsReasoning: Boolean(row.supports_reasoning),
      maxMode: row.max_mode as GatewayMode,
      updatedAt: String(row.updated_at)
    }));
  }

  async upsertPurposePolicy(input: UpsertPurposePolicyInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO org_purpose_policies (
          org_id, purpose, allow_local, allow_external,
          require_user_consent, require_human_approval, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(org_id, purpose) DO UPDATE SET
          allow_local = excluded.allow_local,
          allow_external = excluded.allow_external,
          require_user_consent = excluded.require_user_consent,
          require_human_approval = excluded.require_human_approval,
          updated_at = excluded.updated_at
      `,
      [
        input.orgId,
        input.purpose,
        input.allowLocal ? 1 : 0,
        input.allowExternal ? 1 : 0,
        input.requireUserConsent ? 1 : 0,
        input.requireHumanApproval ? 1 : 0,
        input.updatedAt
      ]
    );
  }

  async listPurposePolicies(orgId: string): Promise<PurposePolicy[]> {
    const result = await this.postgres.pool.query(
      `SELECT * FROM org_purpose_policies WHERE org_id = $1 ORDER BY purpose ASC`,
      [orgId]
    );
    return result.rows.map((row) => ({
      orgId: String(row.org_id),
      purpose: String(row.purpose),
      allowLocal: Boolean(row.allow_local),
      allowExternal: Boolean(row.allow_external),
      requireUserConsent: Boolean(row.require_user_consent),
      requireHumanApproval: Boolean(row.require_human_approval),
      updatedAt: String(row.updated_at)
    }));
  }

  async upsertUserConsent(input: UpsertUserConsentInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO user_consents (
          username, org_id, purpose, consent_granted, updated_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(username, org_id, purpose) DO UPDATE SET
          consent_granted = excluded.consent_granted,
          updated_at = excluded.updated_at
      `,
      [input.username, input.orgId, input.purpose, input.consentGranted ? 1 : 0, input.updatedAt]
    );
  }

  async getUserConsent(username: string, orgId: string, purpose: string): Promise<UserConsentRecord | undefined> {
    const result = await this.postgres.pool.query(
      `SELECT * FROM user_consents WHERE username = $1 AND org_id = $2 AND purpose = $3`,
      [username, orgId, purpose]
    );
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    return {
      username: String(row.username),
      orgId: String(row.org_id),
      purpose: String(row.purpose),
      consentGranted: Boolean(row.consent_granted),
      updatedAt: String(row.updated_at)
    };
  }
}

function mapOrgPolicy(row: Record<string, unknown>): OrgPolicy {
  return {
    orgId: String(row.org_id),
    defaultMode: row.default_mode as GatewayMode,
    allowBringYourOwnKey: Boolean(row.allow_bring_your_own_key),
    allowPlatformManagedKeys: Boolean(row.allow_platform_managed_keys),
    allowedProviders: JSON.parse(String(row.allowed_providers_json)) as ProviderId[],
    allowAuditView: Boolean(row.allow_audit_view),
    requireExternalOptIn: Boolean(row.require_external_opt_in),
    updatedAt: String(row.updated_at)
  };
}
