import { createId } from "../utils/id";
import { GatewayMode, ProviderId } from "../types";
import { WorkflowRepository } from "./workflow-repository";

export type ApprovalStatus = "pending" | "approved" | "denied";

export interface ApprovalRequestRecord {
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
  resolvedAt?: string;
  resolvedBy?: string;
  executionResultJson?: string;
}

export class ApprovalService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async create(input: {
    orgId: string;
    username: string;
    purpose: string;
    provider: ProviderId;
    mode: GatewayMode;
    requestPayloadJson: string;
    reason?: string;
  }): Promise<ApprovalRequestRecord> {
    const record: ApprovalRequestRecord = {
      id: createId("approval"),
      orgId: input.orgId,
      username: input.username,
      purpose: input.purpose,
      provider: input.provider,
      mode: input.mode,
      status: "pending",
      requestPayloadJson: input.requestPayloadJson,
      reason: input.reason,
      createdAt: new Date().toISOString()
    };

    await this.workflowRepository.insertApproval(record);

    return record;
  }

  async listForOrg(orgId: string): Promise<ApprovalRequestRecord[]> {
    return await this.workflowRepository.listApprovalsForOrg(orgId);
  }

  async getById(id: string): Promise<ApprovalRequestRecord | undefined> {
    return await this.workflowRepository.getApprovalById(id);
  }

  async resolve(input: {
    id: string;
    status: "approved" | "denied";
    resolvedBy: string;
    reason?: string;
    executionResultJson?: string;
  }): Promise<ApprovalRequestRecord | undefined> {
    const existing = await this.getById(input.id);
    if (!existing) {
      return undefined;
    }

    const resolvedAt = new Date().toISOString();
    await this.workflowRepository.resolveApproval({
      id: input.id,
      status: input.status,
      resolvedAt,
      resolvedBy: input.resolvedBy,
      reason: input.reason ?? existing.reason,
      executionResultJson: input.executionResultJson ?? existing.executionResultJson
    });

    return await this.getById(input.id);
  }

  async getSummary(orgId?: string) {
    return await this.workflowRepository.getApprovalSummary(orgId);
  }
}
