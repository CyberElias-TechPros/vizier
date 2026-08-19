export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ModelRequest {
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Override the model for this specific call (per-stage selection). */
  model?: string;
  /** Enable streaming token callbacks (when the provider supports it). */
  stream?: boolean;
  /** Called for each streamed token (only when `stream` is true). */
  onToken?: (token: string) => void;
  /** Allow this request to be served from / written to the response cache. */
  cache?: boolean;
  /** Optional caller-supplied metadata (e.g. stage) for caching/observability. */
  metadata?: Record<string, any>;
}

export interface ModelResponse {
  text: string;
  usage?: { input: number; output: number };
  /** True when the response was served from the local cache (no provider call). */
  cached?: boolean;
  /** Model that actually produced the response. */
  model?: string;
  /** Provider id that produced the response. */
  providerId?: string;
}

export interface ModelProvider {
  id: string;
  /** True when the provider can pick/switch sub-models automatically (e.g. omniroute "auto"). */
  supportsAutomode?: boolean;
  complete(req: ModelRequest): Promise<ModelResponse>;
}

export type ProviderId = "anthropic" | "openai" | "omniroute" | "ollama";
