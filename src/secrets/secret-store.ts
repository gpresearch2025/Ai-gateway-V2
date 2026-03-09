export interface SecretStore {
  get(name: string): Promise<string | undefined>;
  set?(name: string, value: string): Promise<void> | void;
}
