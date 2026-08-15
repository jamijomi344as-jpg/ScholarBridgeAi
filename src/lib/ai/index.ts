/**
 * AI provider abstraction (spec §12, §13, §15).
 *
 * Each provider adapter implements the same interface. The router picks a
 * provider per TASK from environment configuration:
 *   AI_PROVIDER_ADMISSIONS | AI_PROVIDER_ESSAY | AI_PROVIDER_GENERAL |
 *   AI_PROVIDER_SEARCH | AI_PROVIDER_DOCUMENT_ANALYSIS
 * (fallback: AI_PROVIDER_DEFAULT, then "openrouter").
 *
 * All API keys stay server-side. No provider-specific logic in the frontend.
 */

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
}

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  taskType?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costEstimate: number;
}

export type AIProviderName = "openai" | "anthropic" | "gemini" | "openrouter";

export interface AIProviderAdapter {
  name: AIProviderName;
  /** Return null if the provider is not configured (no key). */
  call(req: AIRequest, config: AIProviderConfig): Promise<AIResponse | null>;
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

const openrouter: AIProviderAdapter = {
  name: "openrouter",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://scholarbridgeai-1.onrender.com",
        "X-Title": "ScholarBridge",
      },
      body: JSON.stringify({
        model: cfg.model || "google/gemini-2.5-flash",
        messages: [
          ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
          { role: "user", content: req.prompt },
        ],
        temperature: req.temperature ?? 0.6,
        max_tokens: req.maxTokens ?? 4096,
      }),
    });
    if (!res.ok) {
      console.warn("OpenRouter error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.choices?.[0]?.message?.content ?? "",
      provider: "openrouter",
      model: data?.model || cfg.model || "unknown",
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      costEstimate: 0,
    };
  },
};

const openai: AIProviderAdapter = {
  name: "openai",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        messages: [
          ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
          { role: "user", content: req.prompt },
        ],
        temperature: req.temperature ?? 0.6,
        max_tokens: req.maxTokens ?? 4096,
      }),
    });
    if (!res.ok) {
      console.warn("OpenAI error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.choices?.[0]?.message?.content ?? "",
      provider: "openai",
      model: data?.model || cfg.model || "unknown",
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      costEstimate: 0,
    };
  },
};

const anthropic: AIProviderAdapter = {
  name: "anthropic",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model || "claude-3-5-sonnet-latest",
        max_tokens: req.maxTokens ?? 4096,
        system: req.systemInstruction,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    if (!res.ok) {
      console.warn("Anthropic error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "",
      provider: "anthropic",
      model: data?.model || cfg.model || "unknown",
      promptTokens: data?.usage?.input_tokens ?? 0,
      completionTokens: data?.usage?.output_tokens ?? 0,
      costEstimate: 0,
    };
  },
};

const gemini: AIProviderAdapter = {
  name: "gemini",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || "gemini-2.5-flash"}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: req.prompt }] }],
        systemInstruction: req.systemInstruction
          ? { parts: [{ text: req.systemInstruction }] }
          : undefined,
        generationConfig: {
          temperature: req.temperature ?? 0.6,
          maxOutputTokens: req.maxTokens ?? 4096,
        },
      }),
    });
    if (!res.ok) {
      console.warn("Gemini error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      provider: "gemini",
      model: cfg.model || "gemini-2.5-flash",
      promptTokens: 0,
      completionTokens: 0,
      costEstimate: 0,
    };
  },
};

export const PROVIDERS: Record<AIProviderName, AIProviderAdapter> = {
  openrouter,
  openai,
  anthropic,
  gemini,
};

// ---------------------------------------------------------------------------
// Task → provider mapping (spec §12)
// ---------------------------------------------------------------------------

export const TASK_PROVIDER_ENV: Record<string, string> = {
  admissions: "AI_PROVIDER_ADMISSIONS",
  essay: "AI_PROVIDER_ESSAY",
  general: "AI_PROVIDER_GENERAL",
  search: "AI_PROVIDER_SEARCH",
  document: "AI_PROVIDER_DOCUMENT_ANALYSIS",
};

export function providerForTask(taskType: string): { name: AIProviderName; apiKey?: string; model?: string } {
  const envKey = TASK_PROVIDER_ENV[taskType] || "AI_PROVIDER_GENERAL";
  const name = (process.env[envKey] || process.env.AI_PROVIDER_DEFAULT || "openrouter").toLowerCase();
  const providerName: AIProviderName = name in PROVIDERS ? (name as AIProviderName) : "openrouter";

  const apiKeyEnv: Record<AIProviderName, string> = {
    openrouter: "OPENROUTER_API_KEY",
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
  };
  const modelEnv: Record<AIProviderName, string> = {
    openrouter: "OPENROUTER_MODEL",
    openai: "OPENAI_MODEL",
    anthropic: "ANTHROPIC_MODEL",
    gemini: "GEMINI_MODEL",
  };

  return {
    name: providerName,
    apiKey: process.env[apiKeyEnv[providerName]],
    model: process.env[modelEnv[providerName]],
  };
}

// ---------------------------------------------------------------------------
// Service entry (spec §13)
// ---------------------------------------------------------------------------

export async function aiGenerate(req: AIRequest): Promise<AIResponse | null> {
  const taskType = req.taskType || "general";
  const providerCfg = providerForTask(taskType);
  const adapter = PROVIDERS[providerCfg.name];

  try {
    const response = await adapter.call(req, {
      apiKey: providerCfg.apiKey,
      model: providerCfg.model,
    });
    if (response) return response;

    // Provider fallback (spec §16): try openrouter if it isn't the primary.
    if (providerCfg.name !== "openrouter" && process.env.OPENROUTER_API_KEY) {
      const fb = await PROVIDERS.openrouter.call(req, {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL,
      });
      if (fb) return { ...fb, provider: `${fb.provider}:fallback` };
    }
    return null;
  } catch (err) {
    console.error(`AI provider ${providerCfg.name} error:`, err);
    return null;
  }
}
