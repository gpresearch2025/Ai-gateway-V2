import { AiRequestInput } from "../types";

export interface MinimizedPayloadResult {
  payload: AiRequestInput;
  removedFields: string[];
}

export class DataMinimizer {
  minimize(input: AiRequestInput): MinimizedPayloadResult {
    const text = input.text ?? "";
    const redactedText = text
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted_email]")
      .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "[redacted_ssn]")
      .replace(/\b\d{10}\b/g, "[redacted_phone]");

    return {
      payload: {
        ...input,
        text: redactedText
      },
      removedFields: redactedText === text ? [] : ["sensitive_pattern_match"]
    };
  }
}
