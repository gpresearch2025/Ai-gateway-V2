import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { getAppConfig } from "../config/app-config";

const DEFAULT_DB_PATH = getAppConfig().dbPath;

export class SqliteService {
  readonly db: Database.Database;

  constructor(dbPath = DEFAULT_DB_PATH) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS provider_credentials (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        owner_user_id TEXT,
        provider TEXT NOT NULL,
        credential_source TEXT NOT NULL,
        label TEXT NOT NULL,
        encrypted_secret TEXT NOT NULL,
        secret_fingerprint TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        request_id TEXT,
        user_id TEXT,
        org_id TEXT,
        details_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gateway_users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_memberships (
        username TEXT NOT NULL,
        org_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (username, org_id)
      );

      CREATE TABLE IF NOT EXISTS gateway_sessions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        org_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS org_policies (
        org_id TEXT PRIMARY KEY,
        default_mode TEXT NOT NULL,
        allow_bring_your_own_key INTEGER NOT NULL,
        allow_platform_managed_keys INTEGER NOT NULL,
        allowed_providers_json TEXT NOT NULL,
        allow_audit_view INTEGER NOT NULL,
        require_external_opt_in INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS org_provider_capabilities (
        org_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        model_id TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        supports_text INTEGER NOT NULL,
        supports_images INTEGER NOT NULL,
        supports_tools INTEGER NOT NULL,
        supports_reasoning INTEGER NOT NULL,
        max_mode TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (org_id, provider, model_id)
      );

      CREATE TABLE IF NOT EXISTS org_purpose_policies (
        org_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        allow_local INTEGER NOT NULL,
        allow_external INTEGER NOT NULL,
        require_user_consent INTEGER NOT NULL,
        require_human_approval INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (org_id, purpose)
      );

      CREATE TABLE IF NOT EXISTS user_consents (
        username TEXT NOT NULL,
        org_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        consent_granted INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (username, org_id, purpose)
      );

      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        username TEXT NOT NULL,
        purpose TEXT NOT NULL,
        provider TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        request_payload_json TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT,
        execution_result_json TEXT
      );

      CREATE TABLE IF NOT EXISTS execution_jobs (
        id TEXT PRIMARY KEY,
        approval_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        next_run_at TEXT NOT NULL,
        request_payload_json TEXT NOT NULL,
        result_json TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
    `);
    this.ensureColumn("approval_requests", "execution_result_json", "TEXT");
    this.ensureColumn("execution_jobs", "attempt_count", "INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("execution_jobs", "max_attempts", "INTEGER NOT NULL DEFAULT 3");
    this.ensureColumn("execution_jobs", "next_run_at", "TEXT NOT NULL DEFAULT ''");
  }

  private ensureColumn(tableName: string, columnName: string, definition: string) {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    if (columns.some((column) => column.name === columnName)) {
      return;
    }
    this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    if (tableName === "execution_jobs" && columnName === "next_run_at") {
      this.db.exec(`UPDATE execution_jobs SET next_run_at = created_at WHERE next_run_at = ''`);
    }
  }
}
