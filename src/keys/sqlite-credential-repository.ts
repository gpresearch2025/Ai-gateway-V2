import { SqliteService } from "../storage/sqlite";
import type { CredentialSource, ProviderId, StoredCredential } from "../types";
import { CredentialRepository } from "./credential-repository";

export class SqliteCredentialRepository implements CredentialRepository {
  constructor(private readonly sqlite: SqliteService) {}

  insert(credential: StoredCredential): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO provider_credentials (
          id, org_id, owner_user_id, provider, credential_source, label,
          encrypted_secret, secret_fingerprint, status, created_at, updated_at, last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
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
      );
  }

  listForContext(orgId: string, userId: string): StoredCredential[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT *
        FROM provider_credentials
        WHERE org_id = ?
          AND (owner_user_id IS NULL OR owner_user_id = ?)
        ORDER BY created_at ASC
      `)
      .all(orgId, userId) as Array<Record<string, unknown>>;

    return rows.map(mapCredentialRow);
  }

  findLatestActive(
    orgId: string,
    userId: string,
    provider: Exclude<ProviderId, "local_qwen">,
    source: Exclude<CredentialSource, "none">
  ): StoredCredential | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT *
        FROM provider_credentials
        WHERE org_id = ?
          AND provider = ?
          AND credential_source = ?
          AND status = 'active'
          AND (
            (? IN ('org_byok', 'platform_managed') AND owner_user_id IS NULL)
            OR
            (? NOT IN ('org_byok', 'platform_managed') AND owner_user_id = ?)
          )
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(orgId, provider, source, source, source, userId) as Record<string, unknown> | undefined;

    return row ? mapCredentialRow(row) : undefined;
  }

  touchUsage(input: {
    id: string;
    updatedAt: string;
    lastUsedAt: string;
    encryptedSecret?: string;
    secretFingerprint?: string;
  }): void {
    const updates: string[] = ["last_used_at = ?", "updated_at = ?"];
    const values: Array<string> = [input.lastUsedAt, input.updatedAt];

    if (input.encryptedSecret && input.secretFingerprint) {
      updates.push("encrypted_secret = ?", "secret_fingerprint = ?");
      values.push(input.encryptedSecret, input.secretFingerprint);
    }

    this.sqlite.db
      .prepare(`
        UPDATE provider_credentials
        SET ${updates.join(", ")}
        WHERE id = ?
      `)
      .run(...values, input.id);
  }

  delete(id: string): boolean {
    const result = this.sqlite.db
      .prepare(`
        DELETE FROM provider_credentials
        WHERE id = ?
      `)
      .run(id);

    return Number(result.changes) > 0;
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
