import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export class PostgresService {
  readonly pool: Pool;

  private constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  static async create(connectionString: string): Promise<PostgresService> {
    const service = new PostgresService(connectionString);
    await service.initialize();
    return service;
  }

  private async initialize() {
    const schemaPath = path.join(process.cwd(), "db", "postgres-schema.sql");
    const schemaSql = readFileSync(schemaPath, "utf8");
    await this.pool.query(schemaSql);
  }
}
