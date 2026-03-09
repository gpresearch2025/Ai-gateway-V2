import { StoredCredential, ProviderId, CredentialSource } from "../types";
import { decryptSecret, encryptSecret, fingerprintSecret } from "../utils/crypto";
import { createId } from "../utils/id";
import { CredentialRepository } from "./credential-repository";

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";

interface SaveCredentialInput {
  orgId: string;
  ownerUserId?: string;
  provider: Exclude<ProviderId, "local_qwen">;
  credentialSource: Exclude<CredentialSource, "none">;
  label: string;
  secret: string;
}

export class KeyVaultService {
  constructor(private readonly credentials: CredentialRepository) {}

  async save(input: SaveCredentialInput): Promise<StoredCredential> {
    const now = new Date().toISOString();
    const credential: StoredCredential = {
      id: createId("cred"),
      orgId: input.orgId,
      ownerUserId: input.ownerUserId,
      provider: input.provider,
      credentialSource: input.credentialSource,
      label: input.label,
      encryptedSecret: encryptSecret(input.secret),
      secretFingerprint: fingerprintSecret(input.secret),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    await this.credentials.insert(credential);
    return credential;
  }

  async listForContext(orgId: string, userId: string): Promise<StoredCredential[]> {
    return await this.credentials.listForContext(orgId, userId);
  }

  async resolveSecret(
    orgId: string,
    userId: string,
    provider: Exclude<ProviderId, "local_qwen">,
    source: Exclude<CredentialSource, "none">
  ): Promise<string | undefined> {
    const row = await this.credentials.findLatestActive(orgId, userId, provider, source);

    if (!row) {
      return undefined;
    }

    const lastUsedAt = new Date().toISOString();
    const encryptedSecret = row.encryptedSecret;
    const secret = decryptSecret(encryptedSecret);
    const update: {
      id: string;
      updatedAt: string;
      lastUsedAt: string;
      encryptedSecret?: string;
      secretFingerprint?: string;
    } = {
      id: row.id,
      updatedAt: lastUsedAt,
      lastUsedAt
    };

    if (!encryptedSecret.startsWith(ENCRYPTED_SECRET_PREFIX)) {
      update.encryptedSecret = encryptSecret(secret);
      update.secretFingerprint = fingerprintSecret(secret);
    }

    await this.credentials.touchUsage(update);
    return secret;
  }

  async delete(id: string): Promise<boolean> {
    return await this.credentials.delete(id);
  }
}
