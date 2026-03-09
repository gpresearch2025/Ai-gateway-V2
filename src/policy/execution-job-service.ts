import { createId } from "../utils/id";
import { WorkflowRepository } from "./workflow-repository";

export type ExecutionJobStatus = "queued" | "running" | "completed" | "failed" | "dead_letter";

export interface ExecutionJobRecord {
  id: string;
  approvalId: string;
  orgId: string;
  username: string;
  status: ExecutionJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRunAt: string;
  requestPayloadJson: string;
  resultJson?: string;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class ExecutionJobService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async enqueue(input: {
    approvalId: string;
    orgId: string;
    username: string;
    requestPayloadJson: string;
    maxAttempts?: number;
  }): Promise<ExecutionJobRecord> {
    const createdAt = new Date().toISOString();
    const job: ExecutionJobRecord = {
      id: createId("job"),
      approvalId: input.approvalId,
      orgId: input.orgId,
      username: input.username,
      status: "queued",
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? Number(process.env.JOB_MAX_ATTEMPTS ?? 3),
      nextRunAt: createdAt,
      requestPayloadJson: input.requestPayloadJson,
      createdAt
    };

    await this.workflowRepository.insertExecutionJob(job);

    return job;
  }

  async claimNext(): Promise<ExecutionJobRecord | undefined> {
    const row = await this.workflowRepository.findNextQueuedExecutionJob(new Date().toISOString());

    if (!row) {
      return undefined;
    }

    const startedAt = new Date().toISOString();
    await this.workflowRepository.markExecutionJobRunning(String(row.id), startedAt);

    return await this.getById(String(row.id));
  }

  async complete(id: string, resultJson: string): Promise<ExecutionJobRecord | undefined> {
    const completedAt = new Date().toISOString();
    await this.workflowRepository.markExecutionJobCompleted(id, resultJson, completedAt);
    return await this.getById(id);
  }

  async fail(id: string, errorMessage: string): Promise<ExecutionJobRecord | undefined> {
    const existing = await this.getById(id);
    if (!existing) {
      return undefined;
    }

    const completedAt = new Date().toISOString();
    if (existing.attemptCount >= existing.maxAttempts) {
      await this.workflowRepository.deadLetterExecutionJob(id, errorMessage, completedAt);
      return await this.getById(id);
    }

    const delayMs = computeBackoffDelayMs(existing.attemptCount);
    const nextRunAt = new Date(Date.now() + delayMs).toISOString();
    await this.workflowRepository.requeueExecutionJob(id, errorMessage, nextRunAt);
    return await this.getById(id);
  }

  async requeueDeadLetter(id: string): Promise<ExecutionJobRecord | undefined> {
    const existing = await this.getById(id);
    if (!existing || existing.status !== "dead_letter") {
      return undefined;
    }

    const nextRunAt = new Date().toISOString();
    await this.workflowRepository.resetDeadLetterExecutionJob(id, nextRunAt);

    return await this.getById(id);
  }

  async getById(id: string): Promise<ExecutionJobRecord | undefined> {
    return await this.workflowRepository.getExecutionJobById(id);
  }

  async listForOrg(orgId: string): Promise<ExecutionJobRecord[]> {
    return await this.workflowRepository.listExecutionJobsForOrg(orgId);
  }

  async getSummary(orgId?: string) {
    return await this.workflowRepository.getExecutionJobSummary(orgId);
  }
}

function computeBackoffDelayMs(attemptCount: number): number {
  const baseMs = Number(process.env.JOB_RETRY_BASE_MS ?? 2000);
  const maxMs = Number(process.env.JOB_RETRY_MAX_MS ?? 60000);
  return Math.min(baseMs * Math.pow(2, Math.max(0, attemptCount - 1)), maxMs);
}
