import * as vscode from "vscode";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ModelProvider, ModelRequest, ModelResponse, ProviderId } from "./types";
import { AnthropicProvider } from "./anthropicProvider";
import { OpenAICompatibleProvider } from "./openaiProvider";
import { OllamaProvider } from "./ollamaProvider";

let extContext: vscode.ExtensionContext | null = null;

export function initProviderSecrets(context: vscode.ExtensionContext): void {
  extContext = context;
}

function cfg(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration("vizier");
}

export function getProviderId(): ProviderId {
  const v = cfg().get<string>("provider");
  return (["anthropic", "openai", "omniroute", "ollama"].includes(v as string) ? v : "anthropic") as ProviderId;
}

function modelFor(id: ProviderId): string {
  if (id === "openai") return cfg().get<string>("openaiModel") || "gpt-4o";
  if (id === "omniroute") return cfg().get<string>("omnirouteModel") || "auto";
  if (id === "ollama") return cfg().get<string>("ollamaModel") || "llama3.2";
  return cfg().get<string>("preferredModel") || "claude-sonnet-4-20250514";
}

/**
 * Resolve the model to use for a given pipeline stage. A `vizier.stageModels`
 * map (`{ "classification": "gpt-4o-mini", "prd": "claude-..." }`) lets cheap
 * models handle lightweight stages while stronger models handle the rest.
 * Industry pattern: right-size the model per task to cut cost and latency.
 */
export function getEffectiveModel(stage?: string): string {
  const id = getProviderId();
  const overrides = cfg().get<Record<string, string>>("stageModels", {}) || {};
  if (stage && overrides[stage]) return overrides[stage];
  return modelFor(id);
}

/** Stable mode forces low temperature for reproducibility (industry practice). */
export function getEffectiveTemperature(base?: number): number {
  const stable = cfg().get<boolean>("stableMode", false);
  const t = base ?? 0.7;
  return stable ? 0 : t;
}

async function resolveKey(legacyConfigKey: string, secretKey: string): Promise<string | null> {
  if (extContext) {
    const stored = await extContext.secrets.get(secretKey);
    if (stored) return stored;
  }
  const legacy = cfg().get<string>(legacyConfigKey);
  if (legacy && legacy.length > 0) return legacy;
  return null;
}

async function buildProvider(id: ProviderId): Promise<ModelProvider> {
  if (id === "ollama") {
    return buildOllama();
  }

  if (id === "openai") {
    const key = await resolveKey("openaiApiKey", "vizier.openaiApiKey");
    if (!key) throw new Error("CONFIG_NO_API_KEY");
    const baseUrl = cfg().get<string>("openaiBaseUrl") || "https://api.openai.com/v1";
    return new OpenAICompatibleProvider({ id: "openai", baseUrl, apiKey: key, model: modelFor("openai") });
  }

  if (id === "omniroute") {
    const key = await resolveKey("omnirouteApiKey", "vizier.omnirouteApiKey");
    if (!key) throw new Error("CONFIG_NO_API_KEY");
    const baseUrl = cfg().get<string>("omnirouteBaseUrl") || "https://api.openai.com/v1";
    return new OpenAICompatibleProvider({
      id: "omniroute",
      baseUrl,
      apiKey: key,
      model: modelFor("omniroute"),
      supportsAutomode: true
    });
  }

  // Default: Anthropic / Claude
  const key = await resolveKey("anthropicApiKey", "vizier.anthropicApiKey");
  if (!key) throw new Error("CONFIG_NO_API_KEY");
  return new AnthropicProvider(key, modelFor("anthropic"));
}

async function buildOllama(): Promise<ModelProvider> {
  const baseUrl = cfg().get<string>("ollamaBaseUrl") || "http://localhost:11434";
  return new OllamaProvider({ baseUrl, model: modelFor("ollama") });
}

/* ----------------------------- Response cache ----------------------------- */

const memCache = new Map<string, ModelResponse>();
const cacheDir = path.join(os.tmpdir(), "vizier-cache");

function cacheKey(req: ModelRequest): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        system: req.system,
        messages: req.messages,
        model: req.model,
        maxTokens: req.maxTokens,
        temperature: req.temperature
      })
    )
    .digest("hex");
}

function cacheGet(key: string): ModelResponse | null {
  if (memCache.has(key)) return memCache.get(key)!;
  try {
    const fp = path.join(cacheDir, key + ".json");
    if (fs.existsSync(fp)) {
      const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as ModelResponse;
      memCache.set(key, parsed);
      return parsed;
    }
  } catch {
    /* best-effort */
  }
  return null;
}

function cacheSet(key: string, res: ModelResponse): void {
  memCache.set(key, res);
  try {
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, key + ".json"), JSON.stringify(res), "utf8");
  } catch {
    /* best-effort */
  }
}

/* ------------------------------- Budgeting -------------------------------- */

const BUDGET_KEY = "vizier.tokenSpend";

function currentSpend(): number {
  if (!extContext) return 0;
  return extContext.globalState.get<number>(BUDGET_KEY) || 0;
}

function assertBudget(): void {
  const budget = cfg().get<number>("monthlyBudgetTokens", 0);
  if (budget <= 0) return; // 0 = unlimited
  if (currentSpend() >= budget) {
    throw new Error("BUDGET_EXCEEDED");
  }
}

function addSpend(tokens: number): void {
  const budget = cfg().get<number>("monthlyBudgetTokens", 0);
  if (budget <= 0 || !extContext) return; // 0 = unlimited
  extContext.globalState.update(BUDGET_KEY, currentSpend() + tokens);
}

/* --------------------------- Resilience helpers --------------------------- */

function isRetriable(err: any): boolean {
  const status = err?.status ?? err?.statusCode ?? (err?.error?.status);
  if (status === 429) return true;
  if (status && status >= 500 && status < 600) return true;
  // Network-level errors (no status) are retriable
  if (status === undefined && err instanceof Error) return true;
  return false;
}

async function withBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      if (!isRetriable(err) || attempt >= maxRetries) throw err;
      const retryAfter = Number(err?.headers?.["retry-after"] ?? err?.error?.error?.retryAfter);
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(8000, 500 * Math.pow(2, attempt));
      attempt++;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Tries providers in order; on a retriable failure it falls through to the
 * next provider (circuit-breaker / failover pattern). Used when a
 * `vizier.fallbackProvider` is configured.
 */
class FallbackProvider implements ModelProvider {
  id = "fallback-chain";
  constructor(private readonly providers: ModelProvider[]) {}

  async complete(req: ModelRequest): Promise<ModelResponse> {
    let lastErr: any;
    for (const p of this.providers) {
      try {
        return await withBackoff(() => p.complete(req));
      } catch (err) {
        lastErr = err;
        if (!isRetriable(err)) throw err;
      }
    }
    throw lastErr;
  }
}

let cached: { id: ProviderId; provider: ModelProvider } | null = null;
let cachedChain: ModelProvider | null = null;

export async function getProvider(): Promise<ModelProvider> {
  const id = getProviderId();
  if (cachedChain) return cachedChain;

  const primary = await buildProvider(id);
  cached = { id, provider: primary };

  const fallbackId = cfg().get<string>("fallbackProvider");
  if (fallbackId && fallbackId !== id && ["anthropic", "openai", "omniroute", "ollama"].includes(fallbackId)) {
    try {
      const secondary = await buildProvider(fallbackId as ProviderId);
      cachedChain = new FallbackProvider([primary, secondary]);
      return cachedChain;
    } catch {
      // If fallback can't be built (e.g. missing key), use primary only.
    }
  }

  cachedChain = primary;
  return cachedChain;
}

/**
 * Run a request with cross-cutting resilience: response cache, token budget,
 * retry/backoff with Retry-After, and optional provider failover.
 */
export async function complete(req: ModelRequest, provider?: ModelProvider): Promise<ModelResponse> {
  const useCache = req.cache !== false && cfg().get<boolean>("enableCache", true);
  const key = cacheKey(req);

  if (useCache) {
    const hit = cacheGet(key);
    if (hit) return { ...hit, cached: true };
  }

  assertBudget();

  const target = provider || (await getProvider());
  const res = await (target as any).complete(req);

  const spent = (res.usage?.input || 0) + (res.usage?.output || 0);
  addSpend(spent);

  if (useCache) cacheSet(key, res);
  return res;
}

export function clearProviderCache(): void {
  cached = null;
  cachedChain = null;
  memCache.clear();
  try {
    if (fs.existsSync(cacheDir)) {
      for (const f of fs.readdirSync(cacheDir)) {
        try {
          fs.unlinkSync(path.join(cacheDir, f));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}
