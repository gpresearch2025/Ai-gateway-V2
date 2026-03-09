import { ProviderExecutionContext, ProviderResponse } from "../types";
import { ProviderAdapter } from "./provider";

export abstract class BaseHttpProvider implements ProviderAdapter {
  abstract readonly id: "openai" | "anthropic";

  abstract execute(context: ProviderExecutionContext): Promise<ProviderResponse>;

  abstract describe(
    credentialStatus: "missing" | "configured_user" | "configured_org" | "configured_platform"
  ): ReturnType<ProviderAdapter["describe"]>;

  async validateKey(secret: string): Promise<boolean> {
    try {
      await this.execute({
        requestId: "validate",
        payload: { text: "ping" },
        reasoningMode: "off",
        credentialSecret: secret
      });
      return true;
    } catch {
      return false;
    }
  }

  protected requireSecret(context: ProviderExecutionContext): string {
    if (!context.credentialSecret) {
      throw new Error("missing_provider_secret");
    }
    return context.credentialSecret;
  }
}
