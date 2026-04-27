import { env } from "./env";

export async function chatJson<T>(messages: Array<{ role: "system" | "user"; content: string }>, maxTokens = 800) {
  if (!env.openAiApiKey || !env.openAiBaseUrl) {
    throw new Error("LLM API not configured");
  }

  const response = await fetch(`${env.openAiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: JSON.stringify({
      model: env.modelName,
      temperature: 0.3,
      max_tokens: maxTokens,
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`LLM API error ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("empty LLM response");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("invalid JSON from LLM");
    }

    return JSON.parse(match[0]) as T;
  }
}
