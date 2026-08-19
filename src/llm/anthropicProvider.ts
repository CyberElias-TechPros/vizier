import Anthropic from "@anthropic-ai/sdk";
import { ModelProvider, ModelRequest, ModelResponse } from "./types";

/**
 * Anthropic (Claude) provider. Stateless per call: all conversation context is
 * supplied by the caller, so switching to/from this provider never loses state.
 */
export class AnthropicProvider implements ModelProvider {
  id = "anthropic";
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model;
  }

  private buildParams(req: ModelRequest): any {
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content
      }));

    if (messages.length === 0) {
      messages.push({ role: "user", content: req.system || "(no input)" });
    }

    return {
      model: req.model || this.defaultModel,
      max_tokens: req.maxTokens ?? 2000,
      temperature: req.temperature ?? 0.7,
      system: req.system || undefined,
      messages
    };
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const params = this.buildParams(req);

    if (req.stream && req.onToken) {
      const stream = this.client.messages.stream(params as any);
      let text = "";
      stream.on("text", (delta: string) => {
        text += delta;
        req.onToken?.(delta);
      });
      const final = await stream.finalMessage();
      return {
        text,
        model: params.model,
        providerId: this.id,
        usage: {
          input: final.usage?.input_tokens ?? 0,
          output: final.usage?.output_tokens ?? 0
        }
      };
    }

    const res = await this.client.messages.create(
      params as any,
      req.signal ? { signal: req.signal } : undefined
    );

    const text = res.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    return {
      text,
      model: params.model,
      providerId: this.id,
      usage: {
        input: res.usage?.input_tokens ?? 0,
        output: res.usage?.output_tokens ?? 0
      }
    };
  }
}
