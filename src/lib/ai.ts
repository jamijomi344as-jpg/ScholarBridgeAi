/**
 * AI helper — OpenRouter API (https://openrouter.ai).
 *
 * Replace the old Google Gemini integration. Model and API key are
 * configurable via env vars:
 *   OPENROUTER_API_KEY  (required)
 *   OPENROUTER_MODEL    (optional, default "openrouter/auto")
 */
export async function callAI(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/auto";

  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY is not set — AI features will return empty.");
    return "";
  }

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";

  const messages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const requestBody = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      console.warn("OpenRouter API request failed with status:", res.status, await res.text());
      return "";
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text : "";
  } catch (err) {
    console.error("Error calling OpenRouter API:", err);
    return "";
  }
}
