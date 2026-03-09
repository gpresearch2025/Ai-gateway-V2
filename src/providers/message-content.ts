import { AiRequestInput } from "../types";

export type OpenAiCompatibleMessageContent =
  | string
  | Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: {
            url: string;
          };
        }
    >;

export function buildMessageContent(input: AiRequestInput): OpenAiCompatibleMessageContent {
  const text = input.text?.trim();
  const images = input.images ?? [];

  if (images.length === 0) {
    return text && text.length > 0 ? text : "No input provided.";
  }

  const content: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "image_url";
        image_url: {
          url: string;
        };
      }
  > = [];

  if (text && text.length > 0) {
    content.push({
      type: "text",
      text
    });
  }

  for (const imageUrl of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: imageUrl
      }
    });
  }

  if (content.length === 0) {
    content.push({
      type: "text",
      text: "No input provided."
    });
  }

  return content;
}
