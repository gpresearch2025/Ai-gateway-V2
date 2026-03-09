import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Client } from "pg";

const sqlitePath = process.env.AI_GATEWAY_DB_PATH ?? "./data/ai-gateway.db";
const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  console.error("POSTGRES_URL is required");
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), "db", "postgres-schema.sql");
const schemaSql = readFileSync(schemaPath, "utf8");
const sqlite = new Database(sqlitePath, { readonly: true });
const client = new Client({ connectionString: postgresUrl });

const tables = [
  "provider_credentials",
  "audit_events",
  "admin_users",
  "admin_sessions",
  "organizations",
  "gateway_users",
  "user_memberships",
  "gateway_sessions",
  "org_policies",
  "org_provider_capabilities",
  "org_purpose_policies",
  "user_consents",
  "approval_requests",
  "execution_jobs"
];

async function main() {
  await client.connect();
  await client.query(schemaSql);

  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const insertSql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    for (const row of rows) {
      await client.query(insertSql, columns.map((column) => row[column] ?? null));
    }
  }

  await client.end();
  sqlite.close();
  console.log(JSON.stringify({ ok: true, tablesMigrated: tables.length }, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => undefined);
  sqlite.close();
  process.exit(1);
});
