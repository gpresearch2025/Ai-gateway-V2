import { GatewayMode, ProviderId } from "../types";
import { PolicyRepository } from "./policy-repository";

export interface ProviderCapability {
  orgId: string;
  provider: ProviderId;
  modelId: string;
  enabled: boolean;
  supportsText: boolean;
  supportsImages: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  maxMode: GatewayMode;
  updatedAt: string;
}

const DEFAULT_CAPABILITIES: Array<Omit<ProviderCapability, "orgId" | "updatedAt">> = [
  {
    provider: "local_qwen",
    modelId: "qwen3.5-4b",
    enabled: true,
    supportsText: true,
    supportsImages: true,
    supportsTools: true,
    supportsReasoning: true,
    maxMode: "private"
  },
  {
    provider: "openai",
    modelId: "gpt-4.1-mini",
    enabled: false,
    supportsText: true,
    supportsImages: true,
    supportsTools: false,
    supportsReasoning: true,
    maxMode: "max_intelligence"
  },
  {
    provider: "anthropic",
    modelId: "claude-3-5-haiku-latest",
    enabled: false,
    supportsText: true,
    supportsImages: true,
    supportsTools: false,
    supportsReasoning: true,
    maxMode: "max_intelligence"
  }
];

export class CapabilityRegistryService {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async ensureDefaults(orgId: string): Promise<ProviderCapability[]> {
    const existing = await this.listCapabilities(orgId);
    if (existing.length > 0) {
      return existing;
    }

    for (const capability of DEFAULT_CAPABILITIES) {
      await this.upsertCapability({
        orgId,
        ...capability
      });
    }

    return await this.listCapabilities(orgId);
  }

  async upsertCapability(input: Omit<ProviderCapability, "updatedAt">): Promise<ProviderCapability> {
    const updatedAt = new Date().toISOString();
    await this.policyRepository.upsertCapability({
      ...input,
      updatedAt
    });

    return {
      ...input,
      updatedAt
    };
  }

  async listCapabilities(orgId: string): Promise<ProviderCapability[]> {
    return await this.policyRepository.listCapabilities(orgId);
  }
}
