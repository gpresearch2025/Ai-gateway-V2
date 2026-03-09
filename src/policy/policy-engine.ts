import { AiGatewayRequest, PolicyContext, PolicyDecision, ProviderId } from "../types";

export class PolicyEngine {
  evaluate(request: AiGatewayRequest, context?: PolicyContext): PolicyDecision {
    const preferredProvider = request.providerPreference ?? "local_qwen";
    const isExternal = preferredProvider !== "local_qwen";
    const allowedProviders = context?.allowedProviders ?? ["local_qwen", "openai", "anthropic"];
    const capability = context?.providerCapabilities?.find(
      (entry) => entry.provider === preferredProvider && entry.enabled
    );

    if (!allowedProviders.includes(preferredProvider)) {
      return {
        allowed: false,
        allowedModels: allowedProviders,
        requiresDeidentification: isExternal,
        requiresUserConfirmation: isExternal,
        reasonIfDenied: "provider_not_allowed_by_org_policy"
      };
    }

    if (context?.purposePolicy) {
      if (!isExternal && !context.purposePolicy.allowLocal) {
        return {
          allowed: false,
          allowedModels: [preferredProvider],
          requiresDeidentification: false,
          requiresUserConfirmation: false,
          reasonIfDenied: "purpose_not_allowed_for_local_use"
        };
      }

      if (isExternal && !context.purposePolicy.allowExternal) {
        return {
          allowed: false,
          allowedModels: [preferredProvider],
          requiresDeidentification: true,
          requiresUserConfirmation: true,
          reasonIfDenied: "purpose_not_allowed_for_external_use"
        };
      }

      if (context.purposePolicy.requireUserConsent && !context.userConsentGranted) {
        return {
          allowed: false,
          allowedModels: [preferredProvider],
          requiresDeidentification: isExternal,
          requiresUserConfirmation: true,
          reasonIfDenied: "user_consent_required_for_purpose"
        };
      }
    }

    if (!capability) {
      return {
        allowed: false,
        allowedModels: allowedProviders,
        requiresDeidentification: isExternal,
        requiresUserConfirmation: isExternal,
        reasonIfDenied: "provider_capability_not_enabled_for_org"
      };
    }

    if (request.input.images?.length && !capability.supportsImages) {
      return {
        allowed: false,
        allowedModels: [preferredProvider],
        requiresDeidentification: isExternal,
        requiresUserConfirmation: isExternal,
        reasonIfDenied: "provider_model_does_not_support_images"
      };
    }

    if (request.reasoningMode !== "off" && !capability.supportsReasoning) {
      return {
        allowed: false,
        allowedModels: [preferredProvider],
        requiresDeidentification: isExternal,
        requiresUserConfirmation: isExternal,
        reasonIfDenied: "provider_model_does_not_support_reasoning"
      };
    }

    if (modeRank(request.mode) > modeRank(capability.maxMode)) {
      return {
        allowed: false,
        allowedModels: [preferredProvider],
        requiresDeidentification: isExternal,
        requiresUserConfirmation: isExternal,
        reasonIfDenied: "requested_mode_exceeds_provider_capability_policy"
      };
    }

    if (request.mode === "private" && isExternal) {
      return {
        allowed: false,
        allowedModels: ["local_qwen"],
        requiresDeidentification: false,
        requiresUserConfirmation: false,
        reasonIfDenied: "external_providers_blocked_in_private_mode"
      };
    }

    if (request.mode === "private") {
      return {
        allowed: true,
        allowedModels: ["local_qwen"],
        requiresDeidentification: false,
        requiresUserConfirmation: false
      };
    }

    if (isExternal && request.credentialSource === "user_byok" && context && !context.allowBringYourOwnKey) {
      return {
        allowed: false,
        allowedModels: ["local_qwen"],
        requiresDeidentification: true,
        requiresUserConfirmation: true,
        reasonIfDenied: "byok_not_allowed_by_org_policy"
      };
    }

    if (isExternal && request.credentialSource === "platform_managed" && context && !context.allowPlatformManagedKeys) {
      return {
        allowed: false,
        allowedModels: ["local_qwen"],
        requiresDeidentification: true,
        requiresUserConfirmation: true,
        reasonIfDenied: "platform_managed_keys_not_allowed_by_org_policy"
      };
    }

    if (isExternal && request.credentialSource === "none") {
      return {
        allowed: false,
        allowedModels: ["local_qwen"],
        requiresDeidentification: true,
        requiresUserConfirmation: true,
        reasonIfDenied: "external_provider_requires_credentials"
      };
    }

    if (request.mode === "private_plus") {
      const allowedModels: ProviderId[] = isExternal
        ? [preferredProvider]
        : ["local_qwen"];

      if (isExternal && (context?.requireExternalOptIn ?? true) && !request.userOptInExternal) {
        return {
          allowed: false,
          allowedModels,
          requiresDeidentification: true,
          requiresUserConfirmation: true,
          reasonIfDenied: "user_opt_in_required_for_external_call"
        };
      }

      return {
        allowed: true,
        allowedModels,
        requiresDeidentification: isExternal,
        requiresUserConfirmation: isExternal
      };
    }

    return {
      allowed: true,
      allowedModels: [preferredProvider],
      requiresDeidentification: isExternal,
      requiresUserConfirmation: isExternal
    };
  }
}

function modeRank(mode: "private" | "private_plus" | "max_intelligence") {
  if (mode === "private") {
    return 1;
  }
  if (mode === "private_plus") {
    return 2;
  }
  return 3;
}
