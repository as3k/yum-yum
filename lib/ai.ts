import OpenAI from "openai"

// Supports any OpenAI-compatible provider: OpenAI, Ollama, Together, LM Studio, etc.
// Set AI_BASE_URL to override (e.g. http://localhost:11434/v1 for Ollama)
// Set AI_MODEL to change the model (default: gpt-4o-mini)
export function getAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
    baseURL: process.env.AI_BASE_URL,
  })
}

export const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini"
