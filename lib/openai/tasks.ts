import { getOpenAIClient } from "@/lib/openai/client";
import { searchRulesChunks } from "@/lib/supabase/dal";
import { GameId } from "@/lib/games/types";
import { RagChunk } from "@/types/db";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type RequestSummary = {
  subject: string;
  summaryBullets: string[];
  tags: string[];
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
  useOnlineSources?: boolean;
}) {
  const queryEmbedding = await embedText(params.question);
  const chunks = await searchRulesChunks(params.gameId, queryEmbedding, 4, null);
  const shouldUseOnlineSources =
    Boolean(params.useOnlineSources) &&
    (chunks.length === 0 || looksLikeVariantOrMissingRule(params.question, params.houseRulesSummary));

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
    shouldUseOnlineSources
      ? "Use web search only if the provided rule context is insufficient."
      : "Do not use online sources in this run.",
    "Treat house_rules_summary as an allowed session-specific override source.",
    "Never mention RAG, chunk numbers, source URLs, retrieval internals, or citations in the reply.",
    "Use plain, non-technical language for casual players.",
    "Do not use rigid section headers like 'From rulebook' or 'From online sources' unless explicitly asked.",
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
    model: "gpt-4.1",
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

  const ragText = sanitizeGeneratedReply(response.output_text?.trim() || `I'm not sure based on the available ${params.gameName} rules context.`);
  const onlineFallback = shouldUseOnlineSources
    ? await generateWebFallbackAnswer({
        gameName: params.gameName,
        question: params.question,
        houseRulesMode: params.houseRulesMode,
        houseRulesSummary: params.houseRulesSummary,
        history: params.history,
        imageUrl: params.imageUrl,
      })
    : null;

  const text = buildFinalAnswer({
    ragText,
    onlineFallback,
  });

  return {
    text,
    chunks,
    usedOnlineSources: Boolean(onlineFallback),
    onlineCitations: onlineFallback?.citations ?? [],
    usage: response.usage,
  };
}

export async function generateSessionTitleFromExchange(params: {
  gameName: string;
  firstUserMessage: string;
  firstAssistantMessage: string;
}) {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1",
    temperature: 0.2,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "Generate a concise chat title from the first user/assistant exchange.",
              "Rules:",
              "- 3 to 7 words.",
              "- Descriptive statement, not a question.",
              "- Return only the title text.",
              "- No quotes.",
              "- No trailing punctuation.",
            ].join("\n"),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Game: ${params.gameName}`,
              `First user message: ${params.firstUserMessage}`,
              `First assistant message: ${params.firstAssistantMessage}`,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  return sanitizeSessionTitle(response.output_text?.trim() || `${params.gameName} Rules Discussion`);
}

export async function generateRulesSummary(params: { gameId: GameId; gameName: string }) {
  const queryEmbedding = await embedText(
    `${params.gameName} setup turn flow special cards winning conditions penalties common rules questions`
  );
  const chunks = await searchRulesChunks(params.gameId, queryEmbedding, 8, null);

  const contextText = chunks.map((chunk) => chunk.content).join("\n\n");

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1",
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

export async function summarizeRequestForTriage(params: {
  type: "feature" | "game" | "bug" | "other";
  title?: string;
  details: string;
  pageUrl?: string;
  gameId?: string;
  sessionId?: string;
  userAgent?: string;
}): Promise<RequestSummary> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1",
    temperature: 0.2,
    text: {
      format: {
        type: "json_schema",
        name: "request_summary",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string" },
            summaryBullets: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: { type: "string" },
            },
            tags: {
              type: "array",
              minItems: 1,
              maxItems: 6,
              items: { type: "string" },
            },
          },
          required: ["subject", "summaryBullets", "tags"],
        },
      },
    },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You summarize incoming product requests for engineering triage.",
              "Return concise, practical outputs only.",
              "Subject: one short line.",
              "summaryBullets: 2-5 bullets with clear next-action context.",
              "tags: short lowercase labels.",
              "For bug reports, include likely steps to reproduce and expected vs actual behavior when inferable.",
              "Do not include markdown, links, or emojis.",
            ].join("\n"),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(
              {
                type: params.type,
                title: params.title ?? null,
                details: params.details,
                page_url: params.pageUrl ?? null,
                game_id: params.gameId ?? null,
                session_id: params.sessionId ?? null,
                user_agent: params.userAgent ?? null,
              },
              null,
              2
            ),
          },
        ],
      },
    ],
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    return {
      subject: params.title?.trim() || "New request submission",
      summaryBullets: ["Details received and stored for triage.", "Needs manual review."],
      tags: [params.type],
    };
  }

  try {
    const parsed = JSON.parse(raw) as RequestSummary;
    const bullets = Array.isArray(parsed.summaryBullets)
      ? parsed.summaryBullets.map((item) => sanitizeGeneratedReply(String(item))).filter(Boolean).slice(0, 5)
      : [];
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((item) => sanitizeTag(String(item))).filter(Boolean).slice(0, 6)
      : [];

    return {
      subject: sanitizeGeneratedReply(parsed.subject || params.title || "New request submission"),
      summaryBullets: bullets.length ? bullets : ["Details received and stored for triage."],
      tags: tags.length ? tags : [params.type],
    };
  } catch {
    return {
      subject: params.title?.trim() || "New request submission",
      summaryBullets: ["Details received and stored for triage.", "Needs manual review."],
      tags: [params.type],
    };
  }
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
    model: "gpt-4.1",
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
            confidenceDuneImperium: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["detectedTitle", "confidenceUno", "confidenceUnoFlip", "confidenceMahjong", "confidenceDuneImperium"],
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
              "You are matching a game box photo to supported games. Supported games: Uno, Uno Flip, Mahjong, Dune: Imperium. Return confidenceUno, confidenceUnoFlip, confidenceMahjong, and confidenceDuneImperium from 0 to 1.",
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

  const parsed = JSON.parse(raw) as {
    detectedTitle: string;
    confidenceUno: number;
    confidenceUnoFlip: number;
    confidenceMahjong: number;
    confidenceDuneImperium: number;
  };
  const unoConfidence = Math.max(0, Math.min(1, parsed.confidenceUno ?? 0));
  const unoFlipConfidence = Math.max(0, Math.min(1, parsed.confidenceUnoFlip ?? 0));
  const mahjongConfidence = Math.max(0, Math.min(1, parsed.confidenceMahjong ?? 0));
  const duneImperiumConfidence = Math.max(0, Math.min(1, parsed.confidenceDuneImperium ?? 0));

  const candidates: IdentifyCandidate[] = [
    { gameId: "uno", name: "Uno", confidence: unoConfidence },
    { gameId: "uno-flip", name: "Uno Flip", confidence: unoFlipConfidence },
    { gameId: "mahjong", name: "Mahjong", confidence: mahjongConfidence },
    { gameId: "dune-imperium", name: "Dune: Imperium", confidence: duneImperiumConfidence },
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
    .replace(/^From\s+rulebook:\s*/gi, "")
    .replace(/^From\s+online\s+sources:\s*/gi, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
    .replace(/\((https?:\/\/[^\s)]+)\)/gi, "")
    .replace(/\(\[[^\]]+\]\([^)]+\)\)/gi, "")
    .replace(/\(\s*[a-z0-9.-]+\.[a-z]{2,}[^\)]*\)/gi, "")
    .replace(/\[[^\]]*chunk\s*\d+\]/gi, "")
    .replace(/\[?\s*chunk\s*\d+\s*\]?/gi, "")
    .replace(/\(\s*chunk\s*\d+\s*\)/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeVariantOrMissingRule(question: string, houseRulesSummary: string) {
  const combined = `${question} ${houseRulesSummary}`.toLowerCase();
  return /(variant|themed|special card|promo|expansion|custom card|spy|anya|not in rules|not in rulebook)/i.test(combined);
}

async function generateWebFallbackAnswer(params: {
  gameName: string;
  question: string;
  houseRulesMode: "standard" | "custom";
  houseRulesSummary: string;
  history: ChatTurn[];
  imageUrl?: string;
}) {
  const client = getOpenAIClient();
  const historyText = params.history
    .slice(-8)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join("\n");

  const response = await client.responses.create({
    model: "gpt-4.1",
    temperature: 0.2,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              `You are a concise web researcher for ${params.gameName} rules questions.`,
              "Use web search results to provide a short fallback answer (max 4 sentences).",
              "Prioritize official publisher/rulebook sources when possible.",
              params.houseRulesMode === "custom"
                ? `House rules summary: ${params.houseRulesSummary}`
                : "No house-rule overrides.",
              "Keep output conversational, short, and non-technical.",
              "Do not include links, source names, citations, or bracketed references.",
              "Do not use wording like 'rulebook context'. Say 'the rules I have' instead.",
            ].join("\n"),
          },
        ],
      },
      {
        role: "user",
        content: params.imageUrl
          ? [
              {
                type: "input_text",
                text: `History:\n${historyText || "(none)"}\n\nQuestion: ${params.question}`,
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
                text: `History:\n${historyText || "(none)"}\n\nQuestion: ${params.question}`,
              },
            ],
      },
    ],
  });

  const text = sanitizeGeneratedReply(response.output_text?.trim() || "I couldn't find reliable online sources to confirm this.");
  const citations = extractUrlCitations(response);
  return { text, citations };
}

function extractUrlCitations(response: unknown) {
  const output = Array.isArray((response as { output?: unknown[] })?.output)
    ? ((response as { output: Array<{ content?: Array<{ annotations?: Array<{ type?: string; url?: string; title?: string }> }> }> }).output)
    : [];

  const seen = new Set<string>();
  const citations: Array<{ title: string; url: string }> = [];

  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const block of content) {
      const annotations = Array.isArray(block.annotations) ? block.annotations : [];
      for (const annotation of annotations) {
        if (annotation?.type !== "url_citation") continue;
        const url = annotation.url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        citations.push({
          title: annotation.title?.trim() || url,
          url,
        });
        if (citations.length >= 3) return citations;
      }
    }
  }

  return citations;
}

function buildFinalAnswer(params: {
  ragText: string;
  onlineFallback: { text: string; citations: Array<{ title: string; url: string }> } | null;
}) {
  const base = sanitizeGeneratedReply(params.ragText).trim();

  if (!params.onlineFallback) {
    return base;
  }

  const onlineText = sanitizeGeneratedReply(params.onlineFallback.text).trim();
  const note = "I also checked online sources, but there isn't a clear official answer there either.";
  const onlineUsedWithGuidanceNote = "I also checked online sources and found some additional guidance.";
  const onlineUsedNoExtraNote = "I also checked online sources, and they don't add anything beyond this answer.";

  if (!onlineText) {
    return [base, note]
      .filter(Boolean)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const shouldAppendOnlineText = !base || !base.toLowerCase().includes(onlineText.toLowerCase());
  return [
    base,
    shouldAppendOnlineText ? onlineUsedWithGuidanceNote : onlineUsedNoExtraNote,
    shouldAppendOnlineText ? onlineText : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeSessionTitle(raw: string) {
  const cleaned = raw
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.?!,:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  if (!words.length) return "Game Rules Discussion";

  const capped = words.slice(0, 7).join(" ");
  const minWords = capped.split(" ").filter(Boolean).length;
  if (minWords >= 3) return capped;
  return `${capped} Discussion`.trim();
}

function sanitizeTag(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}
