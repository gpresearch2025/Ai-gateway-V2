import { ProviderDescriptor, ProviderExecutionContext, ProviderResponse } from "../types";
import { ProviderAdapter } from "./provider";
import { buildMessageContent } from "./message-content";

export class LocalQwenProvider implements ProviderAdapter {
  readonly id = "local_qwen" as const;

  describe(credentialStatus: ProviderDescriptor["credentialStatus"]): ProviderDescriptor {
    return {
      provider: this.id,
      available: true,
      credentialRequired: false,
      credentialStatus,
      supports: ["text", "image", "tools", "reasoning"]
    };
  }

  async validateKey(): Promise<boolean> {
    const response = await fetch(`${getBaseUrl()}/models`);
    return response.ok;
  }

  async execute(context: ProviderExecutionContext): Promise<ProviderResponse> {
    const response = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.LOCAL_QWEN_MODEL ?? "qwen3.5-4b",
        messages: [
          {
            role: "user",
            content: buildMessageContent(context.payload)
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`local_qwen_request_failed:${response.status}`);
    }

    const data = (await response.json()) as {
      model?: string;
      usage?: { total_tokens?: number };
      choices?: Array<{ message?: { content?: string } }>;
    };

    return {
      provider: this.id,
      model: data.model ?? (process.env.LOCAL_QWEN_MODEL ?? "qwen3.5-4b"),
      outputText: data.choices?.[0]?.message?.content ?? "",
      tokenUsage: data.usage?.total_tokens
    };
  }
}

function getBaseUrl(): string {
  const baseUrl = process.env.LOCAL_QWEN_BASE_URL ?? "http://127.0.0.1:8000/v1";
  return baseUrl.replace(/\/$/, "");
}
