import { SqliteService } from "../storage/sqlite";
import type { AuditEvent } from "../types";
import { AuditEventFilter, AuditRepository } from "./audit-repository";

export class SqliteAuditRepository implements AuditRepository {
  constructor(private readonly sqlite: SqliteService) {}

  insert(event: AuditEvent): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO audit_events (
          id, type, timestamp, request_id, user_id, org_id, details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        event.id,
        event.type,
        event.timestamp,
        event.requestId ?? null,
        event.userId ?? null,
        event.orgId ?? null,
        JSON.stringify(event.details)
      );
  }

  findByRequestId(requestId: string): AuditEvent[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT id, type, timestamp, request_id, user_id, org_id, details_json
        FROM audit_events
        WHERE request_id = ?
        ORDER BY timestamp ASC
      `)
      .all(requestId) as Array<Record<string, unknown>>;

    return rows.map(mapAuditEventRow);
  }

  all(filter?: AuditEventFilter): AuditEvent[] {
    const clauses: string[] = [];
    const params: Array<string> = [];

    if (filter?.orgId) {
      clauses.push("org_id = ?");
      params.push(filter.orgId);
    }
    if (filter?.type) {
      clauses.push("type = ?");
      params.push(filter.type);
    }
    if (filter?.requestId) {
      clauses.push("request_id = ?");
      params.push(filter.requestId);
    }
    if (filter?.userId) {
      clauses.push("user_id = ?");
      params.push(filter.userId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.sqlite.db
      .prepare(`
        SELECT id, type, timestamp, request_id, user_id, org_id, details_json
        FROM audit_events
        ${where}
        ORDER BY timestamp ASC
      `)
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map(mapAuditEventRow);
  }
}

function mapAuditEventRow(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    type: row.type as AuditEvent["type"],
    timestamp: String(row.timestamp),
    requestId: row.request_id ? String(row.request_id) : undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    orgId: row.org_id ? String(row.org_id) : undefined,
    details: JSON.parse(String(row.details_json)) as Record<string, unknown>
  };
}
