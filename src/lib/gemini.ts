export async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return "";
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: systemInstruction
      ? {
          parts: [{ text: systemInstruction }],
        }
      : undefined,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      console.warn("Gemini API request failed with status:", res.status, await res.text());
      return "";
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    return text || "";
  } catch (err) {
    console.error("Error calling Gemini API:", err);
    return "";
  }
}
