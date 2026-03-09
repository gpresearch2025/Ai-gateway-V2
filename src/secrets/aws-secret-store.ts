import { SecretStore } from "./secret-store";

export class AwsSecretsManagerStore implements SecretStore {
  constructor(private readonly secretPrefix = process.env.AWS_SECRET_PREFIX ?? "") {}

  async get(name: string): Promise<string | undefined> {
    const mod = await import("@aws-sdk/client-secrets-manager");
    const client = new mod.SecretsManagerClient({
      region: process.env.AWS_REGION
    });
    const secretId = `${this.secretPrefix}${name}`;
    const response = await client.send(
      new mod.GetSecretValueCommand({
        SecretId: secretId
      })
    );
    return response.SecretString;
  }
}
