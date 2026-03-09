import { PostgresService } from "../storage/postgres";
import type { AuditEvent } from "../types";
import { AuditEventFilter, AuditRepository } from "./audit-repository";

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly postgres: PostgresService) {}

  async insert(event: AuditEvent): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO audit_events (
          id, type, timestamp, request_id, user_id, org_id, details_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        event.id,
        event.type,
        event.timestamp,
        event.requestId ?? null,
        event.userId ?? null,
        event.orgId ?? null,
        JSON.stringify(event.details)
      ]
    );
  }

  async findByRequestId(requestId: string): Promise<AuditEvent[]> {
    const result = await this.postgres.pool.query(
      `
        SELECT id, type, timestamp, request_id, user_id, org_id, details_json
        FROM audit_events
        WHERE request_id = $1
        ORDER BY timestamp ASC
      `,
      [requestId]
    );
    return result.rows.map(mapAuditEventRow);
  }

  async all(filter?: AuditEventFilter): Promise<AuditEvent[]> {
    const clauses: string[] = [];
    const params: Array<string> = [];

    if (filter?.orgId) {
      params.push(filter.orgId);
      clauses.push(`org_id = $${params.length}`);
    }
    if (filter?.type) {
      params.push(filter.type);
      clauses.push(`type = $${params.length}`);
    }
    if (filter?.requestId) {
      params.push(filter.requestId);
      clauses.push(`request_id = $${params.length}`);
    }
    if (filter?.userId) {
      params.push(filter.userId);
      clauses.push(`user_id = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await this.postgres.pool.query(
      `
        SELECT id, type, timestamp, request_id, user_id, org_id, details_json
        FROM audit_events
        ${where}
        ORDER BY timestamp ASC
      `,
      params
    );
    return result.rows.map(mapAuditEventRow);
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
