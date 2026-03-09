import type { GatewayMode, ProviderId } from "../types";
import type { MaybePromise } from "../storage/maybe-promise";
import type { ApprovalRequestRecord, ApprovalStatus } from "./approval-service";
import type { ExecutionJobRecord, ExecutionJobStatus } from "./execution-job-service";

export interface ApprovalSummary {
  total: number;
  pending: number;
  approved: number;
  denied: number;
}

export interface JobSummary {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

export interface CreateApprovalInput {
  id: string;
  orgId: string;
  username: string;
  purpose: string;
  provider: ProviderId;
  mode: GatewayMode;
  status: ApprovalStatus;
  requestPayloadJson: string;
  reason?: string;
  createdAt: string;
}

export interface ResolveApprovalInput {
  id: string;
  status: "approved" | "denied";
  resolvedAt: string;
  resolvedBy: string;
  reason?: string;
  executionResultJson?: string;
}

export interface CreateExecutionJobInput {
  id: string;
  approvalId: string;
  orgId: string;
  username: string;
  status: ExecutionJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRunAt: string;
  requestPayloadJson: string;
  createdAt: string;
}

export interface WorkflowRepository {
  insertApproval(input: CreateApprovalInput): MaybePromise<void>;
  listApprovalsForOrg(orgId: string): MaybePromise<ApprovalRequestRecord[]>;
  getApprovalById(id: string): MaybePromise<ApprovalRequestRecord | undefined>;
  resolveApproval(input: ResolveApprovalInput): MaybePromise<void>;
  getApprovalSummary(orgId?: string): MaybePromise<ApprovalSummary>;

  insertExecutionJob(input: CreateExecutionJobInput): MaybePromise<void>;
  getExecutionJobById(id: string): MaybePromise<ExecutionJobRecord | undefined>;
  listExecutionJobsForOrg(orgId: string): MaybePromise<ExecutionJobRecord[]>;
  findNextQueuedExecutionJob(now: string): MaybePromise<ExecutionJobRecord | undefined>;
  markExecutionJobRunning(id: string, startedAt: string): MaybePromise<void>;
  markExecutionJobCompleted(id: string, resultJson: string, completedAt: string): MaybePromise<void>;
  requeueExecutionJob(id: string, errorMessage: string, nextRunAt: string): MaybePromise<void>;
  deadLetterExecutionJob(id: string, errorMessage: string, completedAt: string): MaybePromise<void>;
  resetDeadLetterExecutionJob(id: string, nextRunAt: string): MaybePromise<void>;
  getExecutionJobSummary(orgId?: string): MaybePromise<JobSummary>;
}
