import { GatewayMode, ProviderId } from "../types";
import { CapabilityRegistryService } from "./capability-registry-service";
import { PolicyRepository } from "./policy-repository";

export interface OrgPolicy {
  orgId: string;
  defaultMode: GatewayMode;
  allowBringYourOwnKey: boolean;
  allowPlatformManagedKeys: boolean;
  allowedProviders: ProviderId[];
  allowAuditView: boolean;
  requireExternalOptIn: boolean;
  updatedAt: string;
}

export class OrgPolicyService {
  private readonly capabilities: CapabilityRegistryService;

  constructor(private readonly policyRepository: PolicyRepository) {
    this.capabilities = new CapabilityRegistryService(policyRepository);
  }

  async ensureDefaultPolicy(orgId: string): Promise<OrgPolicy> {
    const existing = await this.getPolicy(orgId);
    if (existing) {
      await this.capabilities.ensureDefaults(orgId);
      return existing;
    }

    const policy = await this.upsertPolicy({
      orgId,
      defaultMode: "private_plus",
      allowBringYourOwnKey: true,
      allowPlatformManagedKeys: false,
      allowedProviders: ["local_qwen"],
      allowAuditView: true,
      requireExternalOptIn: true
    });
    await this.capabilities.ensureDefaults(orgId);
    return policy;
  }

  async upsertPolicy(input: Omit<OrgPolicy, "updatedAt">): Promise<OrgPolicy> {
    const updatedAt = new Date().toISOString();
    await this.policyRepository.upsertOrgPolicy({
      ...input,
      updatedAt
    });

    return {
      ...input,
      updatedAt
    };
  }

  async getPolicy(orgId: string): Promise<OrgPolicy | undefined> {
    return await this.policyRepository.getOrgPolicy(orgId);
  }

  async listPolicies(): Promise<OrgPolicy[]> {
    return await this.policyRepository.listOrgPolicies();
  }
}
