import { ProviderDescriptor, ProviderExecutionContext, ProviderId, ProviderResponse } from "../types";

export interface ProviderAdapter {
  readonly id: ProviderId;
  describe(credentialStatus: ProviderDescriptor["credentialStatus"]): ProviderDescriptor;
  validateKey(secret: string): Promise<boolean>;
  execute(context: ProviderExecutionContext): Promise<ProviderResponse>;
}
