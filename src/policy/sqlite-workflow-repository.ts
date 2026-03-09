import { SqliteService } from "../storage/sqlite";
import type { GatewayMode, ProviderId } from "../types";
import type { ApprovalRequestRecord, ApprovalStatus } from "./approval-service";
import type { ExecutionJobRecord, ExecutionJobStatus } from "./execution-job-service";
import {
  ApprovalSummary,
  CreateApprovalInput,
  CreateExecutionJobInput,
  JobSummary,
  ResolveApprovalInput,
  WorkflowRepository
} from "./workflow-repository";

export class SqliteWorkflowRepository implements WorkflowRepository {
  constructor(private readonly sqlite: SqliteService) {}

  insertApproval(input: CreateApprovalInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO approval_requests (
          id, org_id, username, purpose, provider, mode, status,
          request_payload_json, reason, created_at, resolved_at, resolved_by, execution_result_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.id,
        input.orgId,
        input.username,
        input.purpose,
        input.provider,
        input.mode,
        input.status,
        input.requestPayloadJson,
        input.reason ?? null,
        input.createdAt,
        null,
        null,
        null
      );
  }

  listApprovalsForOrg(orgId: string): ApprovalRequestRecord[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT *
        FROM approval_requests
        WHERE org_id = ?
        ORDER BY created_at DESC
      `)
      .all(orgId) as Array<Record<string, unknown>>;
    return rows.map(mapApprovalRow);
  }

  getApprovalById(id: string): ApprovalRequestRecord | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT *
        FROM approval_requests
        WHERE id = ?
      `)
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapApprovalRow(row) : undefined;
  }

  resolveApproval(input: ResolveApprovalInput): void {
    this.sqlite.db
      .prepare(`
        UPDATE approval_requests
        SET status = ?, resolved_at = ?, resolved_by = ?, reason = ?, execution_result_json = ?
        WHERE id = ?
      `)
      .run(
        input.status,
        input.resolvedAt,
        input.resolvedBy,
        input.reason ?? null,
        input.executionResultJson ?? null,
        input.id
      );
  }

  getApprovalSummary(orgId?: string): ApprovalSummary {
    const whereClause = orgId ? "WHERE org_id = ?" : "";
    const row = this.sqlite.db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied
        FROM approval_requests
        ${whereClause}
      `)
      .get(...(orgId ? [orgId] : [])) as Record<string, unknown>;

    return {
      total: Number(row.total ?? 0),
      pending: Number(row.pending ?? 0),
      approved: Number(row.approved ?? 0),
      denied: Number(row.denied ?? 0)
    };
  }

  insertExecutionJob(input: CreateExecutionJobInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO execution_jobs (
          id, approval_id, org_id, username, status, attempt_count, max_attempts, next_run_at, request_payload_json,
          result_json, error_message, created_at, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.id,
        input.approvalId,
        input.orgId,
        input.username,
        input.status,
        input.attemptCount,
        input.maxAttempts,
        input.nextRunAt,
        input.requestPayloadJson,
        null,
        null,
        input.createdAt,
        null,
        null
      );
  }

  getExecutionJobById(id: string): ExecutionJobRecord | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT *
        FROM execution_jobs
        WHERE id = ?
      `)
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapJobRow(row) : undefined;
  }

  listExecutionJobsForOrg(orgId: string): ExecutionJobRecord[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT *
        FROM execution_jobs
        WHERE org_id = ?
        ORDER BY created_at DESC
      `)
      .all(orgId) as Array<Record<string, unknown>>;
    return rows.map(mapJobRow);
  }

  findNextQueuedExecutionJob(now: string): ExecutionJobRecord | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT *
        FROM execution_jobs
        WHERE status = 'queued'
          AND next_run_at <= ?
        ORDER BY created_at ASC
        LIMIT 1
      `)
      .get(now) as Record<string, unknown> | undefined;

    return row ? mapJobRow(row) : undefined;
  }

  markExecutionJobRunning(id: string, startedAt: string): void {
    this.sqlite.db
      .prepare(`
        UPDATE execution_jobs
        SET status = 'running', started_at = ?, attempt_count = attempt_count + 1
        WHERE id = ? AND status = 'queued'
      `)
      .run(startedAt, id);
  }

  markExecutionJobCompleted(id: string, resultJson: string, completedAt: string): void {
    this.sqlite.db
      .prepare(`
        UPDATE execution_jobs
        SET status = 'completed', result_json = ?, completed_at = ?
        WHERE id = ?
      `)
      .run(resultJson, completedAt, id);
  }

  requeueExecutionJob(id: string, errorMessage: string, nextRunAt: string): void {
    this.sqlite.db
      .prepare(`
        UPDATE execution_jobs
        SET status = 'queued', error_message = ?, next_run_at = ?, started_at = NULL
        WHERE id = ?
      `)
      .run(errorMessage, nextRunAt, id);
  }

  deadLetterExecutionJob(id: string, errorMessage: string, completedAt: string): void {
    this.sqlite.db
      .prepare(`
        UPDATE execution_jobs
        SET status = 'dead_letter', error_message = ?, completed_at = ?
        WHERE id = ?
      `)
      .run(errorMessage, completedAt, id);
  }

  resetDeadLetterExecutionJob(id: string, nextRunAt: string): void {
    this.sqlite.db
      .prepare(`
        UPDATE execution_jobs
        SET status = 'queued',
            error_message = NULL,
            started_at = NULL,
            completed_at = NULL,
            next_run_at = ?
        WHERE id = ?
      `)
      .run(nextRunAt, id);
  }

  getExecutionJobSummary(orgId?: string): JobSummary {
    const whereClause = orgId ? "WHERE org_id = ?" : "";
    const row = this.sqlite.db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
          SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS dead_letter
        FROM execution_jobs
        ${whereClause}
      `)
      .get(...(orgId ? [orgId] : [])) as Record<string, unknown>;

    return {
      total: Number(row.total ?? 0),
      queued: Number(row.queued ?? 0),
      running: Number(row.running ?? 0),
      completed: Number(row.completed ?? 0),
      failed: Number(row.failed ?? 0),
      deadLetter: Number(row.dead_letter ?? 0)
    };
  }
}

function mapApprovalRow(row: Record<string, unknown>): ApprovalRequestRecord {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    username: String(row.username),
    purpose: String(row.purpose),
    provider: row.provider as ProviderId,
    mode: row.mode as GatewayMode,
    status: row.status as ApprovalStatus,
    requestPayloadJson: String(row.request_payload_json),
    reason: row.reason ? String(row.reason) : undefined,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined,
    executionResultJson: row.execution_result_json ? String(row.execution_result_json) : undefined
  };
}

function mapJobRow(row: Record<string, unknown>): ExecutionJobRecord {
  return {
    id: String(row.id),
    approvalId: String(row.approval_id),
    orgId: String(row.org_id),
    username: String(row.username),
    status: row.status as ExecutionJobStatus,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    nextRunAt: String(row.next_run_at),
    requestPayloadJson: String(row.request_payload_json),
    resultJson: row.result_json ? String(row.result_json) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined
  };
}
