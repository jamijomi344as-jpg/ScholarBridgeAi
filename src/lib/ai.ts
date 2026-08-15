/**
 * Backward-compatible wrapper around the AI service layer.
 * Existing routes call `callAI(prompt, systemInstruction)` — this delegates
 * to the provider router and logs usage (spec §16).
 */
import { aiGenerate } from "@/lib/ai/index";
import { logAIUsage } from "@/lib/ai/usage";

export async function callAI(
  prompt: string,
  systemInstruction?: string,
  opts: { taskType?: string; profileId?: number | null } = {}
): Promise<string> {
  const taskType = opts.taskType || "general";
  const response = await aiGenerate({
    prompt,
    systemInstruction,
    taskType,
  });

  if (!response) return "";

  try {
    await logAIUsage({
      profileId: opts.profileId ?? null,
      taskType,
      provider: response.provider,
      model: response.model,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      costEstimate: response.costEstimate,
      status: "success",
    });
  } catch (err) {
    console.error("Failed to log AI usage:", err);
  }

  return response.text;
}
