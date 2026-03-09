import { PostgresService } from "../storage/postgres";
import type { CredentialSource, ProviderId, StoredCredential } from "../types";
import { CredentialRepository } from "./credential-repository";

export class PostgresCredentialRepository implements CredentialRepository {
  constructor(private readonly postgres: PostgresService) {}

  async insert(credential: StoredCredential): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO provider_credentials (
          id, org_id, owner_user_id, provider, credential_source, label,
          encrypted_secret, secret_fingerprint, status, created_at, updated_at, last_used_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        credential.id,
        credential.orgId,
        credential.ownerUserId ?? null,
        credential.provider,
        credential.credentialSource,
        credential.label,
        credential.encryptedSecret,
        credential.secretFingerprint,
        credential.status,
        credential.createdAt,
        credential.updatedAt,
        credential.lastUsedAt ?? null
      ]
    );
  }

  async listForContext(orgId: string, userId: string): Promise<StoredCredential[]> {
    const result = await this.postgres.pool.query(
      `
        SELECT *
        FROM provider_credentials
        WHERE org_id = $1
          AND (owner_user_id IS NULL OR owner_user_id = $2)
        ORDER BY created_at ASC
      `,
      [orgId, userId]
    );
    return result.rows.map(mapCredentialRow);
  }

  async findLatestActive(
    orgId: string,
    userId: string,
    provider: Exclude<ProviderId, "local_qwen">,
    source: Exclude<CredentialSource, "none">
  ): Promise<StoredCredential | undefined> {
    const result = await this.postgres.pool.query(
      `
        SELECT *
        FROM provider_credentials
        WHERE org_id = $1
          AND provider = $2
          AND credential_source = $3
          AND status = 'active'
          AND (
            ($4 IN ('org_byok', 'platform_managed') AND owner_user_id IS NULL)
            OR
            ($5 NOT IN ('org_byok', 'platform_managed') AND owner_user_id = $6)
          )
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [orgId, provider, source, source, source, userId]
    );
    const row = result.rows[0];
    return row ? mapCredentialRow(row) : undefined;
  }

  async touchUsage(input: {
    id: string;
    updatedAt: string;
    lastUsedAt: string;
    encryptedSecret?: string;
    secretFingerprint?: string;
  }): Promise<void> {
    if (input.encryptedSecret && input.secretFingerprint) {
      await this.postgres.pool.query(
        `
          UPDATE provider_credentials
          SET last_used_at = $1, updated_at = $2, encrypted_secret = $3, secret_fingerprint = $4
          WHERE id = $5
        `,
        [input.lastUsedAt, input.updatedAt, input.encryptedSecret, input.secretFingerprint, input.id]
      );
      return;
    }

    await this.postgres.pool.query(
      `
        UPDATE provider_credentials
        SET last_used_at = $1, updated_at = $2
        WHERE id = $3
      `,
      [input.lastUsedAt, input.updatedAt, input.id]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.postgres.pool.query(`DELETE FROM provider_credentials WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

function mapCredentialRow(row: Record<string, unknown>): StoredCredential {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    provider: row.provider as StoredCredential["provider"],
    credentialSource: row.credential_source as StoredCredential["credentialSource"],
    label: String(row.label),
    encryptedSecret: String(row.encrypted_secret),
    secretFingerprint: String(row.secret_fingerprint),
    status: row.status as StoredCredential["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : undefined
  };
}
