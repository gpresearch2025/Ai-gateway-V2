import { PolicyRepository } from "./policy-repository";

export interface PurposePolicy {
  orgId: string;
  purpose: string;
  allowLocal: boolean;
  allowExternal: boolean;
  requireUserConsent: boolean;
  requireHumanApproval: boolean;
  updatedAt: string;
}

export interface UserConsentRecord {
  username: string;
  orgId: string;
  purpose: string;
  consentGranted: boolean;
  updatedAt: string;
}

const DEFAULT_PURPOSE_POLICIES: Array<Omit<PurposePolicy, "orgId" | "updatedAt">> = [
  {
    purpose: "explain_labs",
    allowLocal: true,
    allowExternal: true,
    requireUserConsent: true,
    requireHumanApproval: false
  },
  {
    purpose: "summarize_trends",
    allowLocal: true,
    allowExternal: true,
    requireUserConsent: true,
    requireHumanApproval: false
  },
  {
    purpose: "generate_questions_for_doctor",
    allowLocal: true,
    allowExternal: false,
    requireUserConsent: true,
    requireHumanApproval: true
  }
];

export class ConsentPurposeService {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async ensureDefaultPolicies(orgId: string): Promise<PurposePolicy[]> {
    const existing = await this.listPurposePolicies(orgId);
    if (existing.length > 0) {
      return existing;
    }

    for (const policy of DEFAULT_PURPOSE_POLICIES) {
      await this.upsertPurposePolicy({
        orgId,
        ...policy
      });
    }

    return await this.listPurposePolicies(orgId);
  }

  async upsertPurposePolicy(input: Omit<PurposePolicy, "updatedAt">): Promise<PurposePolicy> {
    const updatedAt = new Date().toISOString();
    await this.policyRepository.upsertPurposePolicy({
      ...input,
      updatedAt
    });

    return {
      ...input,
      updatedAt
    };
  }

  async listPurposePolicies(orgId: string): Promise<PurposePolicy[]> {
    return await this.policyRepository.listPurposePolicies(orgId);
  }

  async getPurposePolicy(orgId: string, purpose: string): Promise<PurposePolicy | undefined> {
    return (await this.ensureDefaultPolicies(orgId)).find((policy) => policy.purpose === purpose);
  }

  async setUserConsent(input: Omit<UserConsentRecord, "updatedAt">): Promise<UserConsentRecord> {
    const updatedAt = new Date().toISOString();
    await this.policyRepository.upsertUserConsent({
      ...input,
      updatedAt
    });

    return {
      ...input,
      updatedAt
    };
  }

  async getUserConsent(username: string, orgId: string, purpose: string): Promise<UserConsentRecord | undefined> {
    return await this.policyRepository.getUserConsent(username, orgId, purpose);
  }
}
