import { ProviderId } from "../types";
import { AnthropicProvider } from "./anthropic-provider";
import { LocalQwenProvider } from "./local-qwen-provider";
import { OpenAiProvider } from "./openai-provider";
import { ProviderAdapter } from "./provider";

export class ProviderRegistry {
  private readonly providers: Record<ProviderId, ProviderAdapter>;

  constructor() {
    this.providers = {
      local_qwen: new LocalQwenProvider(),
      openai: new OpenAiProvider(),
      anthropic: new AnthropicProvider()
    };
  }

  get(providerId: ProviderId): ProviderAdapter {
    return this.providers[providerId];
  }

  all(): ProviderAdapter[] {
    return Object.values(this.providers);
  }
}
