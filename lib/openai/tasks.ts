import { getOpenAIClient } from "@/lib/openai/client";
import { searchRulesChunks } from "@/lib/supabase/dal";
import { GameId } from "@/lib/games/types";
import { RagChunk } from "@/types/db";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0]?.embedding ?? [];
}

export async function generateChatAnswer(params: {
  gameId: GameId;
  gameName: string;
  houseRulesMode: "standard" | "custom";
  houseRulesSummary: string;
  question: string;
  history: ChatTurn[];
  imageUrl?: string;
}) {
  const queryEmbedding = await embedText(params.question);
  const chunks = await searchRulesChunks(params.gameId, queryEmbedding, 4, null);

  const contextText = chunks.length
    ? chunks
        .map((chunk, index) => `Rule context ${index + 1}: ${chunk.content}`)
        .join("\n\n")
    : "(No relevant context found in official rules chunks.)";

  const system = [
    `You are PlayOnLeh, a tabletop rules assistant for ${params.gameName}.`,
    "Be concise, practical, and conversational for players at a real table.",
    params.houseRulesMode === "custom"
      ? `House rules summary: ${params.houseRulesSummary}`
      : "Use official rules only. There are no house-rule overrides in this session.",
    "Use retrieved official rule context as the default source for official-rules claims.",
    "Treat house_rules_summary as an allowed session-specific override source.",
    "Never mention chunk numbers, source URLs, retrieval internals, or citations in the reply.",
    "If an image is provided, briefly use visible state when relevant.",
    "If image details are insufficient or ambiguous, ask 1-2 clarifying questions instead of guessing.",
    params.gameId === "uno" || params.gameId === "uno-flip"
      ? "If the user asks about a card/rule that is not supported by retrieved context, ask: 'Is this a variant/themed deck? What does the card text/effect say?'"
      : "If the user asks about a rule not supported by retrieved context, ask for exact rule text/effect.",
    "If user-provided card text/effect exists in chat history or house_rules_summary, treat it as an allowed session override and apply it.",
    "When applying such an override, explicitly say: 'This rule is not in the base rulebook; I'm applying your variant card rule.'",
    "Do not invent missing variant effects. If the effect text is missing, ask 1-2 clarifying questions and pause the ruling.",
    "When relevant, explicitly structure as:",
    "1) Under your house rules...",
    "2) Officially...",
    params.gameId === "mahjong"
      ? "For Mahjong: if base rules and house rules conflict, prioritize house rules and explicitly mention the override."
      : "If official rules and house rules conflict, prioritize house rules and explicitly mention the override.",
    params.gameId === "mahjong"
      ? "For Mahjong: if the question is not covered by the base rules context, explicitly say 'not found in the base rules' and ask 1-2 clarifying questions."
      : "If context does not support an answer, say you're not sure and ask clarifying questions when needed.",
    "If context is missing/conflicting, explicitly say: I'm not sure.",
    "Do not hallucinate rules.",
    "Context:",
    contextText,
  ].join("\n");

  const historyText = params.history
    .slice(-10)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join("\n");

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: system }],
      },
      {
        role: "user",
        content: params.imageUrl
          ? [
              {
                type: "input_text",
                text: `Conversation history:\n${historyText || "(none)"}\n\nUser question: ${params.question}`,
              },
              {
                type: "input_image",
                image_url: params.imageUrl,
                detail: "auto",
              },
            ]
          : [
              {
                type: "input_text",
                text: `Conversation history:\n${historyText || "(none)"}\n\nUser question: ${params.question}`,
              },
            ],
      },
    ],
  });

  const text = sanitizeGeneratedReply(response.output_text?.trim() || `I'm not sure based on the available ${params.gameName} rules context.`);

  return {
    text,
    chunks,
    usage: response.usage,
  };
}

export async function generateRulesSummary(params: { gameId: GameId; gameName: string }) {
  const queryEmbedding = await embedText(
    `${params.gameName} setup turn flow special cards winning conditions penalties common rules questions`
  );
  const chunks = await searchRulesChunks(params.gameId, queryEmbedding, 8, null);

  const contextText = chunks.map((chunk) => chunk.content).join("\n\n");

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.1,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              `Create a short rules summary for ${params.gameName}.`,
              "Return one short paragraph (4-6 sentences) giving an overall summary of the game rules.",
              "Do not output headings or bullet points.",
              "Use only provided context.",
              "Do not mention chunk numbers, retrieval internals, or source tags in the output.",
              "If context is missing, state uncertainty briefly.",
              "Context:",
              contextText || "(No context available)",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  return {
    summaryText:
      response.output_text?.trim() || "I'm not sure because I don't have enough rules context available yet.",
    chunks,
  };
}

type IdentifyCandidate = {
  gameId: GameId;
  name: string;
  confidence: number;
};

export async function identifyGameFromImage(params: { base64DataUrl: string }): Promise<{
  detectedGame: GameId | null;
  confidence: number;
  rawLabel?: string;
  candidates: IdentifyCandidate[];
  best?: IdentifyCandidate;
}> {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    text: {
      format: {
        type: "json_schema",
        name: "game_identification",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            detectedTitle: { type: "string" },
            confidenceUno: { type: "number", minimum: 0, maximum: 1 },
            confidenceUnoFlip: { type: "number", minimum: 0, maximum: 1 },
            confidenceMahjong: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["detectedTitle", "confidenceUno", "confidenceUnoFlip", "confidenceMahjong"],
        },
      },
    },
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "You are matching a game box photo to supported games. Supported games: Uno, Uno Flip, Mahjong. Return confidenceUno, confidenceUnoFlip, and confidenceMahjong from 0 to 1.",
          },
          {
            type: "input_image",
            image_url: params.base64DataUrl,
            detail: "auto",
          },
        ],
      },
    ],
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    return { detectedGame: null, confidence: 0, rawLabel: "", candidates: [] };
  }

  const parsed = JSON.parse(raw) as { detectedTitle: string; confidenceUno: number; confidenceUnoFlip: number; confidenceMahjong: number };
  const unoConfidence = Math.max(0, Math.min(1, parsed.confidenceUno ?? 0));
  const unoFlipConfidence = Math.max(0, Math.min(1, parsed.confidenceUnoFlip ?? 0));
  const mahjongConfidence = Math.max(0, Math.min(1, parsed.confidenceMahjong ?? 0));

  const candidates: IdentifyCandidate[] = [
    { gameId: "uno", name: "Uno", confidence: unoConfidence },
    { gameId: "uno-flip", name: "Uno Flip", confidence: unoFlipConfidence },
    { gameId: "mahjong", name: "Mahjong", confidence: mahjongConfidence },
  ];
  candidates.sort((a, b) => b.confidence - a.confidence);

  const best = candidates[0];
  const accepted = best && best.confidence >= 0.6;

  return {
    detectedGame: accepted ? best.gameId : null,
    confidence: best?.confidence ?? 0,
    rawLabel: parsed.detectedTitle,
    candidates,
    best,
  };
}

export function formatRagContext(chunks: RagChunk[]) {
  return chunks.map((chunk, index) => `Rule context ${index + 1}: ${chunk.content}`).join("\n\n");
}

function sanitizeGeneratedReply(text: string) {
  return text
    .replace(/\[[^\]]*chunk\s*\d+\]/gi, "")
    .replace(/\[?\s*chunk\s*\d+\s*\]?/gi, "")
    .replace(/\(\s*chunk\s*\d+\s*\)/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
