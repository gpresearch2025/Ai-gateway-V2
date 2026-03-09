import { AwsSecretsManagerStore } from "../secrets/aws-secret-store";
import { AzureKeyVaultSecretStore } from "../secrets/azure-keyvault-secret-store";
import { EnvSecretStore } from "../secrets/env-secret-store";
import { SecretStore } from "../secrets/secret-store";
import { StorageProvider } from "../storage/factory";

export interface AppConfig {
  port: number;
  dbPath: string;
  storageProvider: StorageProvider;
  postgresUrl?: string;
  authMode: "local" | "trusted_header";
  trustedAuthUserHeader: string;
  trustedAuthOrgHeader: string;
  trustedAuthRoleHeader: string;
  jobWorkerIntervalMs: number;
  secrets: SecretStore;
  secretProvider: string;
}

let cachedSecrets: SecretStore | undefined;

export function getAppConfig(): AppConfig {
  const secretProvider = process.env.SECRET_STORE_PROVIDER ?? "env";
  const storageProvider = (process.env.DATABASE_PROVIDER ?? "sqlite") as StorageProvider;
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: process.env.AI_GATEWAY_DB_PATH ?? "./data/ai-gateway.db",
    storageProvider,
    postgresUrl: process.env.POSTGRES_URL,
    authMode: (process.env.AUTH_MODE ?? "local") as "local" | "trusted_header",
    trustedAuthUserHeader: (process.env.TRUSTED_AUTH_USER_HEADER ?? "x-auth-user").toLowerCase(),
    trustedAuthOrgHeader: (process.env.TRUSTED_AUTH_ORG_HEADER ?? "x-auth-org").toLowerCase(),
    trustedAuthRoleHeader: (process.env.TRUSTED_AUTH_ROLE_HEADER ?? "x-auth-role").toLowerCase(),
    jobWorkerIntervalMs: Number(process.env.JOB_WORKER_INTERVAL_MS ?? 2000),
    secretProvider,
    secrets: cachedSecrets ?? (cachedSecrets = buildSecretStore(secretProvider))
  };
}

function buildSecretStore(provider: string): SecretStore {
  if (provider === "aws-secrets-manager") {
    return new AwsSecretsManagerStore();
  }
  if (provider === "azure-key-vault") {
    return new AzureKeyVaultSecretStore();
  }
  return new EnvSecretStore();
}
