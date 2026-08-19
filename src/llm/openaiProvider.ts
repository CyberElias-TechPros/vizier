import { ModelProvider, ModelRequest, ModelResponse } from "./types";

export interface OpenAICompatibleOptions {
  id?: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** When true, the provider is allowed to switch sub-models itself (e.g. omniroute "auto"). */
  supportsAutomode?: boolean;
}

/**
 * OpenAI-compatible chat-completions provider. Covers OpenAI directly and any
 * OpenAI-compatible gateway (OpenRouter, omniroute, local servers, etc.) by
 * pointing `baseUrl` at the gateway. The app owns all conversation context, so
 * server-side model switching (automode) is seamless: each call is
 * self-contained with the full message history.
 */
export class OpenAICompatibleProvider implements ModelProvider {
  id: string;
  supportsAutomode?: boolean;
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(opts: OpenAICompatibleOptions) {
    this.id = opts.id || "openai";
    this.supportsAutomode = opts.supportsAutomode;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.defaultModel = opts.model;
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const messages: { role: string; content: string }[] = req.messages.map((m) => ({
      role: m.role,
      content: m.content
    }));
    if (req.system) {
      messages.unshift({ role: "system", content: req.system });
    }

    const model = req.model || this.defaultModel;
    const body: any = {
      model,
      messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2000,
      stream: false
    };

    // Streaming path (SSE). Parsed incrementally; full text returned at the end.
    if (req.stream && req.onToken) {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: req.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ ...body, stream: true })
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(`OpenAI-compatible provider error ${res.status}: ${err}`);
      }
      let text = "";
      let input = 0;
      let output = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta: string = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              text += delta;
              req.onToken?.(delta);
            }
            if (json?.usage) {
              input = json.usage.prompt_tokens ?? input;
              output = json.usage.completion_tokens ?? output;
            }
          } catch {
            /* ignore partial JSON */
          }
        }
      }
      return {
        text,
        model,
        providerId: this.id,
        usage: { input, output }
      };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const statusErr: any = new Error(`OpenAI-compatible provider error ${res.status}: ${errBody}`);
      statusErr.status = res.status;
      throw statusErr;
    }

    const data: any = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return {
      text,
      model,
      providerId: this.id,
      usage: {
        input: data?.usage?.prompt_tokens ?? 0,
        output: data?.usage?.completion_tokens ?? 0
      }
    };
  }
}
