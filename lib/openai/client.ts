import OpenAI from "openai";
import { getServerEnv } from "@/lib/env/server";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (client) {
    return client;
  }
  client = new OpenAI({ apiKey: getServerEnv().openaiApiKey });
  return client;
}
