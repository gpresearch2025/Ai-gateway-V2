import { ProviderDescriptor, ProviderExecutionContext, ProviderResponse } from "../types";
import { BaseHttpProvider } from "./base-http-provider";

export class AnthropicProvider extends BaseHttpProvider {
  readonly id = "anthropic" as const;

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
    const prompt = context.payload.text ?? "No text input provided.";
    const images = context.payload.images ?? [];
    const apiKey = this.requireSecret(context);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              ...images.map((imageUrl) => ({
                type: "image",
                source: normalizeAnthropicImageSource(imageUrl)
              }))
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`anthropic_request_failed:${response.status}`);
    }

    const data = (await response.json()) as {
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      content?: Array<{ type?: string; text?: string }>;
    };
    return {
      provider: this.id,
      model: data.model ?? (process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest"),
      outputText: data.content?.find((item) => item.type === "text")?.text ?? "",
      tokenUsage: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)
    };
  }
}

function normalizeAnthropicImageSource(imageUrl: string): {
  type: "url" | "base64";
  url?: string;
  media_type?: string;
  data?: string;
} {
  const dataUrlMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      type: "base64",
      media_type: dataUrlMatch[1],
      data: dataUrlMatch[2]
    };
  }

  return {
    type: "url",
    url: imageUrl
  };
}
