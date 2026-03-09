import { SecretStore } from "./secret-store";

export class EnvSecretStore implements SecretStore {
  async get(name: string): Promise<string | undefined> {
    return process.env[name];
  }
}
