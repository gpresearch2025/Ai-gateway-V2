import { PostgresService } from "../storage/postgres";
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

export class PostgresWorkflowRepository implements WorkflowRepository {
  constructor(private readonly postgres: PostgresService) {}

  async insertApproval(input: CreateApprovalInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO approval_requests (
          id, org_id, username, purpose, provider, mode, status,
          request_payload_json, reason, created_at, resolved_at, resolved_by, execution_result_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
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
      ]
    );
  }

  async listApprovalsForOrg(orgId: string): Promise<ApprovalRequestRecord[]> {
    const result = await this.postgres.pool.query(
      `SELECT * FROM approval_requests WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    return result.rows.map(mapApprovalRow);
  }

  async getApprovalById(id: string): Promise<ApprovalRequestRecord | undefined> {
    const result = await this.postgres.pool.query(`SELECT * FROM approval_requests WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapApprovalRow(row) : undefined;
  }

  async resolveApproval(input: ResolveApprovalInput): Promise<void> {
    await this.postgres.pool.query(
      `
        UPDATE approval_requests
        SET status = $1, resolved_at = $2, resolved_by = $3, reason = $4, execution_result_json = $5
        WHERE id = $6
      `,
      [input.status, input.resolvedAt, input.resolvedBy, input.reason ?? null, input.executionResultJson ?? null, input.id]
    );
  }

  async getApprovalSummary(orgId?: string): Promise<ApprovalSummary> {
    const result = orgId
      ? await this.postgres.pool.query(
          `
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied
            FROM approval_requests
            WHERE org_id = $1
          `,
          [orgId]
        )
      : await this.postgres.pool.query(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied
          FROM approval_requests
        `);
    const row = result.rows[0] ?? {};
    return {
      total: Number(row.total ?? 0),
      pending: Number(row.pending ?? 0),
      approved: Number(row.approved ?? 0),
      denied: Number(row.denied ?? 0)
    };
  }

  async insertExecutionJob(input: CreateExecutionJobInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO execution_jobs (
          id, approval_id, org_id, username, status, attempt_count, max_attempts, next_run_at, request_payload_json,
          result_json, error_message, created_at, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
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
      ]
    );
  }

  async getExecutionJobById(id: string): Promise<ExecutionJobRecord | undefined> {
    const result = await this.postgres.pool.query(`SELECT * FROM execution_jobs WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapJobRow(row) : undefined;
  }

  async listExecutionJobsForOrg(orgId: string): Promise<ExecutionJobRecord[]> {
    const result = await this.postgres.pool.query(
      `SELECT * FROM execution_jobs WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    return result.rows.map(mapJobRow);
  }

  async findNextQueuedExecutionJob(now: string): Promise<ExecutionJobRecord | undefined> {
    const result = await this.postgres.pool.query(
      `
        SELECT * FROM execution_jobs
        WHERE status = 'queued' AND next_run_at <= $1
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [now]
    );
    const row = result.rows[0];
    return row ? mapJobRow(row) : undefined;
  }

  async markExecutionJobRunning(id: string, startedAt: string): Promise<void> {
    await this.postgres.pool.query(
      `
        UPDATE execution_jobs
        SET status = 'running', started_at = $1, attempt_count = attempt_count + 1
        WHERE id = $2 AND status = 'queued'
      `,
      [startedAt, id]
    );
  }

  async markExecutionJobCompleted(id: string, resultJson: string, completedAt: string): Promise<void> {
    await this.postgres.pool.query(
      `UPDATE execution_jobs SET status = 'completed', result_json = $1, completed_at = $2 WHERE id = $3`,
      [resultJson, completedAt, id]
    );
  }

  async requeueExecutionJob(id: string, errorMessage: string, nextRunAt: string): Promise<void> {
    await this.postgres.pool.query(
      `
        UPDATE execution_jobs
        SET status = 'queued', error_message = $1, next_run_at = $2, started_at = NULL
        WHERE id = $3
      `,
      [errorMessage, nextRunAt, id]
    );
  }

  async deadLetterExecutionJob(id: string, errorMessage: string, completedAt: string): Promise<void> {
    await this.postgres.pool.query(
      `UPDATE execution_jobs SET status = 'dead_letter', error_message = $1, completed_at = $2 WHERE id = $3`,
      [errorMessage, completedAt, id]
    );
  }

  async resetDeadLetterExecutionJob(id: string, nextRunAt: string): Promise<void> {
    await this.postgres.pool.query(
      `
        UPDATE execution_jobs
        SET status = 'queued', error_message = NULL, started_at = NULL, completed_at = NULL, next_run_at = $1
        WHERE id = $2
      `,
      [nextRunAt, id]
    );
  }

  async getExecutionJobSummary(orgId?: string): Promise<JobSummary> {
    const result = orgId
      ? await this.postgres.pool.query(
          `
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
              SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
              SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS dead_letter
            FROM execution_jobs
            WHERE org_id = $1
          `,
          [orgId]
        )
      : await this.postgres.pool.query(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
            SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS dead_letter
          FROM execution_jobs
        `);
    const row = result.rows[0] ?? {};
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
