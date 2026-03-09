import { SecretStore } from "./secret-store";

export class AzureKeyVaultSecretStore implements SecretStore {
  constructor(private readonly vaultUrl = process.env.AZURE_KEY_VAULT_URL ?? "") {}

  async get(name: string): Promise<string | undefined> {
    const identity = await import("@azure/identity");
    const secrets = await import("@azure/keyvault-secrets");
    const credential = new identity.DefaultAzureCredential();
    const client = new secrets.SecretClient(this.vaultUrl, credential);
    const result = await client.getSecret(name);
    return result.value;
  }
}
