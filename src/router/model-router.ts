import { AuditLogService } from "../audit/audit-log";
import { getAppConfig } from "../config/app-config";
import { KeyVaultService } from "../keys/key-vault";
import { DataMinimizer } from "../privacy/data-minimizer";
import { ProviderRegistry } from "../providers/registry";
import { AiGatewayRequest, ProviderId, ProviderResponse } from "../types";
import { createId } from "../utils/id";

export class ModelRouter {
  constructor(
    private readonly providers: ProviderRegistry,
    private readonly keys: KeyVaultService,
    private readonly minimizer: DataMinimizer,
    private readonly audit: AuditLogService
  ) {}

  async route(
    request: AiGatewayRequest,
    options?: { requestId?: string }
  ): Promise<{ requestId: string; response: ProviderResponse }> {
    const requestId = options?.requestId ?? createId("req");
    const providerId: ProviderId = request.providerPreference ?? "local_qwen";
    const provider = this.providers.get(providerId);

    let payload = request.input;
    if (providerId !== "local_qwen") {
      const minimized = this.minimizer.minimize(request.input);
      payload = minimized.payload;
      await this.audit.write({
        type: "PAYLOAD_MINIMIZED",
        requestId,
        userId: request.userId,
        orgId: request.orgId,
        details: {
          provider: providerId,
          removedFields: minimized.removedFields
        }
      });
    }

    let credentialSecret: string | undefined;
    if (providerId !== "local_qwen" && request.credentialSource !== "none") {
      credentialSecret = await this.keys.resolveSecret(
        request.orgId,
        request.userId,
        providerId,
        request.credentialSource
      );
      if (!credentialSecret && request.credentialSource === "platform_managed") {
        credentialSecret = await getAppConfig().secrets.get(`${providerId.toUpperCase()}_API_KEY`);
      }
      if (!credentialSecret) {
        throw new Error(`missing_credentials_for_provider:${providerId}`);
      }
    }

    await this.audit.write({
      type: "AI_PROVIDER_CALLED",
      requestId,
      userId: request.userId,
      orgId: request.orgId,
      details: {
        provider: providerId,
        credentialSource: request.credentialSource,
        reasoningMode: request.reasoningMode
      }
    });

    const response = await provider.execute({
      requestId,
      payload,
      reasoningMode: request.reasoningMode,
      credentialSecret
    });

    await this.audit.write({
      type: "AI_RESPONSE_RETURNED",
      requestId,
      userId: request.userId,
      orgId: request.orgId,
      details: {
        provider: response.provider,
        model: response.model,
        tokenUsage: response.tokenUsage
      }
    });

    return { requestId, response };
  }
}
