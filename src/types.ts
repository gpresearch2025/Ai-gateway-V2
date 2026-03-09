export type GatewayMode = "private" | "private_plus" | "max_intelligence";

export type TaskType =
  | "summary"
  | "question_answer"
  | "image_understanding"
  | "document_analysis"
  | "agent_task";

export type ProviderId = "local_qwen" | "openai" | "anthropic";

export type CredentialSource =
  | "none"
  | "user_byok"
  | "org_byok"
  | "platform_managed";

export type ReasoningMode = "off" | "light" | "full";

export interface AiRequestInput {
  text?: string;
  images?: string[];
  video?: string[];
  audio?: string[];
}

export interface AiGatewayRequest {
  userId: string;
  orgId: string;
  mode: GatewayMode;
  purpose: string;
  taskType: TaskType;
  providerPreference?: ProviderId;
  credentialSource: CredentialSource;
  reasoningMode: ReasoningMode;
  input: AiRequestInput;
  userOptInExternal?: boolean;
}

export interface PolicyContext {
  allowedProviders: ProviderId[];
  allowBringYourOwnKey: boolean;
  allowPlatformManagedKeys: boolean;
  requireExternalOptIn: boolean;
  providerCapabilities?: Array<{
    provider: ProviderId;
    modelId: string;
    enabled: boolean;
    supportsImages: boolean;
    supportsReasoning: boolean;
    maxMode: GatewayMode;
  }>;
  purposePolicy?: {
    allowLocal: boolean;
    allowExternal: boolean;
    requireUserConsent: boolean;
    requireHumanApproval: boolean;
  };
  userConsentGranted?: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  allowedModels: ProviderId[];
  requiresDeidentification: boolean;
  requiresUserConfirmation: boolean;
  reasonIfDenied?: string;
}

export interface ProviderDescriptor {
  provider: ProviderId;
  available: boolean;
  credentialRequired: boolean;
  credentialStatus: "not_required" | "missing" | "configured_user" | "configured_org" | "configured_platform";
  supports: string[];
  models?: string[];
}

export interface StoredCredential {
  id: string;
  orgId: string;
  ownerUserId?: string;
  provider: Exclude<ProviderId, "local_qwen">;
  credentialSource: Exclude<CredentialSource, "none">;
  label: string;
  encryptedSecret: string;
  secretFingerprint: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface AuditEvent {
  id: string;
  type:
    | "AI_REQUEST_RECEIVED"
    | "POLICY_DECISION_MADE"
    | "PAYLOAD_MINIMIZED"
    | "AI_REQUEST_DENIED"
    | "AI_PROVIDER_CALLED"
    | "AI_RESPONSE_RETURNED"
    | "AI_KEY_ADDED"
    | "AI_KEY_VALIDATED"
    | "AI_KEY_DELETED";
  timestamp: string;
  requestId?: string;
  userId?: string;
  orgId?: string;
  details: Record<string, unknown>;
}

export interface ProviderExecutionContext {
  requestId: string;
  payload: AiRequestInput;
  reasoningMode: ReasoningMode;
  credentialSecret?: string;
}

export interface ProviderResponse {
  provider: ProviderId;
  model: string;
  outputText: string;
  tokenUsage?: number;
}
