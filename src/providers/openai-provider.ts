import { ProviderDescriptor, ProviderExecutionContext, ProviderResponse } from "../types";
import { BaseHttpProvider } from "./base-http-provider";
import { buildMessageContent } from "./message-content";

export class OpenAiProvider extends BaseHttpProvider {
  readonly id = "openai" as const;

  describe(credentialStatus: ProviderDescriptor["credentialStatus"]): ProviderDescriptor {
    return {
      provider: this.id,
      available: true,
      credentialRequired: true,
      credentialStatus,
      supports: ["text", "image", "reasoning"]
    };
  }

  async execute(context: ProviderExecutionContext): Promise<ProviderResponse> {
    const apiKey = this.requireSecret(context);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: buildMessageContent(context.payload)
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`openai_request_failed:${response.status}`);
    }

    const data = (await response.json()) as {
      model?: string;
      usage?: { total_tokens?: number };
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      provider: this.id,
      model: data.model ?? (process.env.OPENAI_MODEL ?? "gpt-4.1-mini"),
      outputText: data.choices?.[0]?.message?.content ?? "",
      tokenUsage: data.usage?.total_tokens
    };
  }
}
