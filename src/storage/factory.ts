import { getAppConfig } from "../config/app-config";
import { SqliteService } from "./sqlite";

export type StorageProvider = "sqlite" | "postgres";

export function createStorage() {
  const config = getAppConfig();

  if (config.storageProvider === "postgres") {
    throw new Error(
      "DATABASE_PROVIDER=postgres is not implemented yet. Finish the repository/runtime refactor before enabling it."
    );
  }

  return new SqliteService(config.dbPath);
}
