import type { CredentialSource, ProviderId, StoredCredential } from "../types";
import type { MaybePromise } from "../storage/maybe-promise";

export interface CredentialRepository {
  insert(credential: StoredCredential): MaybePromise<void>;
  listForContext(orgId: string, userId: string): MaybePromise<StoredCredential[]>;
  findLatestActive(
    orgId: string,
    userId: string,
    provider: Exclude<ProviderId, "local_qwen">,
    source: Exclude<CredentialSource, "none">
  ): MaybePromise<StoredCredential | undefined>;
  touchUsage(input: {
    id: string;
    updatedAt: string;
    lastUsedAt: string;
    encryptedSecret?: string;
    secretFingerprint?: string;
  }): MaybePromise<void>;
  delete(id: string): MaybePromise<boolean>;
}
