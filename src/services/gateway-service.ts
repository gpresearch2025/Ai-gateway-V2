import { AuditLogService } from "../audit/audit-log";
import { KeyVaultService } from "../keys/key-vault";
import { CapabilityRegistryService } from "../policy/capability-registry-service";
import { ApprovalService } from "../policy/approval-service";
import { ConsentPurposeService } from "../policy/consent-purpose-service";
import { ExecutionJobService } from "../policy/execution-job-service";
import { OrgPolicyService } from "../policy/org-policy-service";
import { PolicyEngine } from "../policy/policy-engine";
import { ProviderRegistry } from "../providers/registry";
import { ModelRouter } from "../router/model-router";
import { AiGatewayRequest, AuditEvent, PolicyContext, ProviderDescriptor, ProviderId, StoredCredential } from "../types";
import { DataMinimizer } from "../privacy/data-minimizer";
import { createId } from "../utils/id";

export interface GatewayServiceDependencies {
  approvals: ApprovalService;
  jobs: ExecutionJobService;
  capabilityRegistry: CapabilityRegistryService;
  consentPurpose: ConsentPurposeService;
  orgPolicies: OrgPolicyService;
  audit: AuditLogService;
  keys: KeyVaultService;
}

export class GatewayService {
  private readonly policy = new PolicyEngine();
  private readonly providers = new ProviderRegistry();
  private readonly minimizer = new DataMinimizer();
  private readonly router: ModelRouter;

  constructor(private readonly deps: GatewayServiceDependencies) {
    this.router = new ModelRouter(this.providers, this.deps.keys, this.minimizer, this.deps.audit);
  }

  async getAvailableProviders(orgId: string, userId: string): Promise<ProviderDescriptor[]> {
    const orgPolicy = await this.deps.orgPolicies.ensureDefaultPolicy(orgId);
    const capabilities = await this.deps.capabilityRegistry.ensureDefaults(orgId);
    const credentials = await this.deps.keys.listForContext(orgId, userId);

    return this.providers.all().map((provider) => {
      const providerCapabilities = capabilities.filter(
        (capability) => capability.provider === provider.id && capability.enabled
      );

      if (!orgPolicy.allowedProviders.includes(provider.id)) {
        return {
          ...provider.describe("missing"),
          available: false,
          models: []
        };
      }

      if (providerCapabilities.length === 0) {
        return {
          ...provider.describe("missing"),
          available: false,
          models: []
        };
      }

      if (provider.id === "local_qwen") {
        return {
          ...provider.describe("not_required"),
          models: providerCapabilities.map((capability) => capability.modelId)
        };
      }

      const userCredential = credentials.find(
        (credential) => credential.provider === provider.id && credential.ownerUserId === userId
      );
      if (userCredential) {
        return {
          ...provider.describe("configured_user"),
          models: providerCapabilities.map((capability) => capability.modelId)
        };
      }

      const orgCredential = credentials.find(
        (credential) => credential.provider === provider.id && credential.ownerUserId === undefined
      );
      if (orgCredential) {
        return {
          ...provider.describe(
            orgCredential.credentialSource === "platform_managed" ? "configured_platform" : "configured_org"
          ),
          models: providerCapabilities.map((capability) => capability.modelId)
        };
      }

      return {
        ...provider.describe("missing"),
        models: providerCapabilities.map((capability) => capability.modelId)
      };
    });
  }

  async handleRequest(request: AiGatewayRequest, options?: { skipApproval?: boolean }) {
    const requestId = createId("req");
    const orgPolicy = await this.deps.orgPolicies.ensureDefaultPolicy(request.orgId);
    const capabilities = await this.deps.capabilityRegistry.ensureDefaults(request.orgId);
    const purposePolicy = await this.deps.consentPurpose.getPurposePolicy(request.orgId, request.purpose);
    const userConsent = await this.deps.consentPurpose.getUserConsent(request.userId, request.orgId, request.purpose);
    const policyContext: PolicyContext = {
      allowedProviders: orgPolicy.allowedProviders,
      allowBringYourOwnKey: orgPolicy.allowBringYourOwnKey,
      allowPlatformManagedKeys: orgPolicy.allowPlatformManagedKeys,
      requireExternalOptIn: orgPolicy.requireExternalOptIn,
      providerCapabilities: capabilities,
      purposePolicy: purposePolicy
        ? {
            allowLocal: purposePolicy.allowLocal,
            allowExternal: purposePolicy.allowExternal,
            requireUserConsent: purposePolicy.requireUserConsent,
            requireHumanApproval: purposePolicy.requireHumanApproval
          }
        : undefined,
      userConsentGranted: userConsent?.consentGranted ?? false
    };
    const decision = this.policy.evaluate(request, policyContext);
    await this.deps.audit.write({
      type: "AI_REQUEST_RECEIVED",
      requestId,
      userId: request.userId,
      orgId: request.orgId,
      details: {
        mode: request.mode,
        purpose: request.purpose,
        providerPreference: request.providerPreference ?? "local_qwen",
        orgPolicy,
        purposePolicy,
        userConsent
      }
    });
    await this.deps.audit.write({
      type: "POLICY_DECISION_MADE",
      requestId,
      userId: request.userId,
      orgId: request.orgId,
      details: {
        ...decision
      }
    });

    if (!decision.allowed) {
      const event = await this.deps.audit.write({
        type: "AI_REQUEST_DENIED",
        requestId,
        userId: request.userId,
        orgId: request.orgId,
        details: {
          reason: decision.reasonIfDenied
        }
      });

      return {
        ok: false,
        requestId,
        decision
      };
    }

    if (purposePolicy?.requireHumanApproval && !options?.skipApproval) {
      const approval = await this.deps.approvals.create({
        orgId: request.orgId,
        username: request.userId,
        purpose: request.purpose,
        provider: request.providerPreference ?? "local_qwen",
        mode: request.mode,
        requestPayloadJson: JSON.stringify(request),
        reason: "purpose_requires_human_approval"
      });

      await this.deps.audit.write({
        type: "AI_REQUEST_DENIED",
        requestId,
        userId: request.userId,
        orgId: request.orgId,
        details: {
          reason: "approval_required",
          approvalId: approval.id
        }
      });

      return {
        ok: false,
        requestId,
        decision: {
          ...decision,
          allowed: false,
          reasonIfDenied: "approval_required"
        },
        approval
      };
    }

    const { response } = await this.router.route(request, { requestId });
    return {
      ok: true,
      requestId,
      decision,
      response
    };
  }

  async testProviderKey(providerId: ProviderId, secret: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    const valid = await provider.validateKey(secret);
    await this.deps.audit.write({
      type: "AI_KEY_VALIDATED",
      details: {
        provider: providerId,
        valid
      }
    });
    return valid;
  }

  async saveCredential(input: {
    orgId: string;
    ownerUserId?: string;
    provider: "openai" | "anthropic";
    credentialSource: "user_byok" | "org_byok" | "platform_managed";
    label: string;
    secret: string;
  }): Promise<StoredCredential> {
    const saved = await this.deps.keys.save(input);
    await this.deps.audit.write({
      type: "AI_KEY_ADDED",
      userId: input.ownerUserId,
      orgId: input.orgId,
      details: {
        provider: input.provider,
        credentialSource: input.credentialSource,
        label: input.label,
        credentialId: saved.id
      }
    });
    return saved;
  }

  async deleteCredential(id: string): Promise<boolean> {
    const deleted = await this.deps.keys.delete(id);
    if (deleted) {
      await this.deps.audit.write({
        type: "AI_KEY_DELETED",
        details: {
          credentialId: id
        }
      });
    }
    return deleted;
  }

  async listCredentials(orgId: string, userId: string): Promise<StoredCredential[]> {
    return await this.deps.keys.listForContext(orgId, userId);
  }

  async getAuditEvents(requestId: string) {
    return await this.deps.audit.findByRequestId(requestId);
  }

  async getAllAuditEvents(filter?: {
    orgId?: string;
    type?: AuditEvent["type"];
    requestId?: string;
    userId?: string;
  }) {
    return await this.deps.audit.all(filter);
  }

  async getRequestHistory(orgId: string, filters?: { purpose?: string; provider?: string; status?: string }) {
    const events = await this.deps.audit.all({ orgId });
    const byRequest = new Map<
      string,
      {
        requestId: string;
        timestamp: string;
        userId?: string;
        purpose?: string;
        provider?: string;
        mode?: string;
        status: "completed" | "denied" | "pending_approval" | "in_progress";
        responseModel?: string;
      }
    >();

    for (const event of events) {
      if (!event.requestId) {
        continue;
      }

      const current =
        byRequest.get(event.requestId) ??
        {
          requestId: event.requestId,
          timestamp: event.timestamp,
          userId: event.userId,
          purpose: undefined,
          provider: undefined,
          mode: undefined,
          status: "in_progress" as const,
          responseModel: undefined
        };

      current.timestamp = event.timestamp;
      current.userId = event.userId ?? current.userId;

      if (event.type === "AI_REQUEST_RECEIVED") {
        current.purpose = String(event.details.purpose ?? current.purpose ?? "");
        current.provider = String(event.details.providerPreference ?? current.provider ?? "");
        current.mode = String(event.details.mode ?? current.mode ?? "");
      }

      if (event.type === "AI_PROVIDER_CALLED") {
        current.provider = String(event.details.provider ?? current.provider ?? "");
      }

      if (event.type === "AI_RESPONSE_RETURNED") {
        current.status = "completed";
        current.provider = String(event.details.provider ?? current.provider ?? "");
        current.responseModel = String(event.details.model ?? current.responseModel ?? "");
      }

      if (event.type === "AI_REQUEST_DENIED") {
        const reason = String(event.details.reason ?? "");
        current.status = reason === "approval_required" ? "pending_approval" : "denied";
      }

      byRequest.set(event.requestId, current);
    }

    return Array.from(byRequest.values())
      .filter((item) => {
        if (filters?.purpose && item.purpose !== filters.purpose) {
          return false;
        }
        if (filters?.provider && item.provider !== filters.provider) {
          return false;
        }
        if (filters?.status && item.status !== filters.status) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }

  async getOrgPolicy(orgId: string) {
    return await this.deps.orgPolicies.ensureDefaultPolicy(orgId);
  }

  async listOrgPolicies() {
    return await this.deps.orgPolicies.listPolicies();
  }

  async upsertOrgPolicy(input: {
    orgId: string;
    defaultMode: "private" | "private_plus" | "max_intelligence";
    allowBringYourOwnKey: boolean;
    allowPlatformManagedKeys: boolean;
    allowedProviders: ProviderId[];
    allowAuditView: boolean;
    requireExternalOptIn: boolean;
  }) {
    return await this.deps.orgPolicies.upsertPolicy(input);
  }

  async listCapabilities(orgId: string) {
    return await this.deps.capabilityRegistry.ensureDefaults(orgId);
  }

  async upsertCapability(input: {
    orgId: string;
    provider: ProviderId;
    modelId: string;
    enabled: boolean;
    supportsText: boolean;
    supportsImages: boolean;
    supportsTools: boolean;
    supportsReasoning: boolean;
    maxMode: "private" | "private_plus" | "max_intelligence";
  }) {
    return await this.deps.capabilityRegistry.upsertCapability(input);
  }

  async listPurposePolicies(orgId: string) {
    return await this.deps.consentPurpose.ensureDefaultPolicies(orgId);
  }

  async upsertPurposePolicy(input: {
    orgId: string;
    purpose: string;
    allowLocal: boolean;
    allowExternal: boolean;
    requireUserConsent: boolean;
    requireHumanApproval: boolean;
  }) {
    return await this.deps.consentPurpose.upsertPurposePolicy(input);
  }

  async getUserConsent(userId: string, orgId: string, purpose: string) {
    return await this.deps.consentPurpose.getUserConsent(userId, orgId, purpose);
  }

  async setUserConsent(input: {
    username: string;
    orgId: string;
    purpose: string;
    consentGranted: boolean;
  }) {
    return await this.deps.consentPurpose.setUserConsent(input);
  }

  async listApprovals(orgId: string) {
    return await this.deps.approvals.listForOrg(orgId);
  }

  async resolveApproval(input: {
    id: string;
    status: "approved" | "denied";
    resolvedBy: string;
    reason?: string;
  }) {
    return await this.deps.approvals.resolve(input);
  }

  async resolveApprovalAndExecute(input: {
    id: string;
    status: "approved" | "denied";
    resolvedBy: string;
    reason?: string;
  }) {
    const approval = await this.deps.approvals.getById(input.id);
    if (!approval) {
      return undefined;
    }

    if (input.status === "denied") {
      return {
        approval: await this.deps.approvals.resolve(input),
        execution: null,
        job: null
      };
    }

    const resolvedApproval = await this.deps.approvals.resolve({
      ...input,
      executionResultJson: JSON.stringify({ queued: true })
    });
    const job = await this.deps.jobs.enqueue({
      approvalId: approval.id,
      orgId: approval.orgId,
      username: approval.username,
      requestPayloadJson: approval.requestPayloadJson
    });

    return {
      approval: resolvedApproval,
      execution: null,
      job
    };
  }

  async processNextExecutionJob() {
    const job = await this.deps.jobs.claimNext();
    if (!job) {
      return undefined;
    }

    try {
      const parsedRequest = JSON.parse(job.requestPayloadJson) as AiGatewayRequest;
      const execution = await this.handleRequest(parsedRequest, { skipApproval: true });
      const completedJob = await this.deps.jobs.complete(job.id, JSON.stringify(execution));
      await this.deps.approvals.resolve({
        id: job.approvalId,
        status: "approved",
        resolvedBy: "job-worker",
        executionResultJson: JSON.stringify(execution)
      });
      await this.deps.audit.write({
        type: "AI_RESPONSE_RETURNED",
        userId: parsedRequest.userId,
        orgId: parsedRequest.orgId,
        details: {
          approvalId: job.approvalId,
          jobId: job.id,
          replayed: true
        }
      });
      return completedJob;
    } catch (error) {
      const failedJob = await this.deps.jobs.fail(
        job.id,
        error instanceof Error ? error.message : "job_execution_failed"
      );
      return failedJob;
    }
  }

  async listExecutionJobs(orgId: string) {
    return await this.deps.jobs.listForOrg(orgId);
  }

  async requeueExecutionJob(id: string) {
    return await this.deps.jobs.requeueDeadLetter(id);
  }

  async getOrgOperationalSummary(orgId: string) {
    return {
      approvals: await this.deps.approvals.getSummary(orgId),
      jobs: await this.deps.jobs.getSummary(orgId)
    };
  }

  async getSystemHealth() {
    return {
      ok: true,
      approvals: await this.deps.approvals.getSummary(),
      jobs: await this.deps.jobs.getSummary()
    };
  }
}
