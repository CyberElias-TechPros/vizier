import { ModelProvider, ModelRequest, ModelResponse } from "./types";

export interface OllamaOptions {
  baseUrl: string;
  model: string;
}

/**
 * Local, on-prem model provider backed by an Ollama server (https://ollama.com).
 * Talks to the native `/api/chat` endpoint (NOT the OpenAI-compatible shim) so
 * it works with any locally-pulled GGUF model without an API key. No source
 * code ever leaves the machine — the server is local by default.
 *
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaProvider implements ModelProvider {
  id = "ollama";
  private baseUrl: string;
  private defaultModel: string;

  constructor(opts: OllamaOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.defaultModel = opts.model || "llama3.2";
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const messages: { role: string; content: string }[] = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    for (const m of req.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const model = req.model || this.defaultModel;
    const body: any = {
      model,
      messages,
      stream: false,
      options: {
        temperature: req.temperature ?? 0.7,
        num_predict: req.maxTokens ?? 2000
      }
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const statusErr: any = new Error(`Ollama provider error ${res.status}: ${errBody}`);
      statusErr.status = res.status;
      throw statusErr;
    }

    const data: any = await res.json();
    const text: string = data?.message?.content ?? "";
    return {
      text,
      model,
      providerId: this.id,
      usage: {
        input: data?.prompt_eval_count ?? 0,
        output: data?.eval_count ?? 0
      }
    };
  }
}
