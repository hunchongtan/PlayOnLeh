import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChatAnswer, generateSessionTitleFromExchange } from "@/lib/openai/tasks";
import { getGameDefinition } from "@/lib/games/registry";
import { createMessage, getMessagesForSession, getSessionById, updateSessionTitleIfDefault, uploadChatImage } from "@/lib/supabase/dal";
import { buildDefaultSessionTitle, resolveSessionTitle } from "@/lib/sessions/title";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  useOnlineSources: z.boolean().optional(),
});

const formSchema = z.object({
  sessionId: z.string().uuid(),
  gameId: z.enum(["uno", "uno-flip", "mahjong", "dune-imperium"]).optional(),
  text: z.string().max(2000).optional(),
  useOnlineSources: z.boolean().optional(),
});

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

type ParsedChatRequest = {
  sessionId: string;
  gameId?: "uno" | "uno-flip" | "mahjong" | "dune-imperium";
  message: string;
  imageFile?: File;
  useOnlineSources: boolean;
};

export async function POST(req: Request) {
  try {
    const parsedRequest = await parseChatRequest(req);
    if (!parsedRequest.ok) {
      return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
    }

    const { sessionId, message, imageFile, gameId, useOnlineSources } = parsedRequest.value;
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (gameId && gameId !== session.game_id) {
      return NextResponse.json({ error: "Game does not match session" }, { status: 400 });
    }

    const game = getGameDefinition(session.game_id);
    if (!game) {
      return NextResponse.json({ error: "Unsupported game in session" }, { status: 400 });
    }

    let imageUrl: string | undefined;
    let imageMime: string | undefined;
    if (imageFile) {
      if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
        return NextResponse.json({ error: "Unsupported image type. Use JPG, PNG, or WEBP." }, { status: 400 });
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Image is too large. Max size is 8MB." }, { status: 400 });
      }
      imageMime = imageFile.type;
      imageUrl = await uploadChatImage({
        sessionId,
        file: imageFile,
        mime: imageFile.type,
      });
    }

    const history = await getMessagesForSession(sessionId);
    const userMessage = await createMessage({
      sessionId,
      role: "user",
      content: message,
      imageUrl,
      imageMime,
    });
    let sessionTitle = resolveSessionTitle({ title: session.title, gameName: game.name });

    const answer = await generateChatAnswer({
      gameId: session.game_id,
      gameName: game.name,
      houseRulesMode: session.house_rules_mode,
      houseRulesSummary: session.house_rules_summary,
      question: message,
      imageUrl,
      history: history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      useOnlineSources,
    });

    const assistantMessage = await createMessage({
      sessionId,
      role: "assistant",
      content: answer.text,
      model: "gpt-4.1",
      promptTokens: answer.usage?.input_tokens,
      completionTokens: answer.usage?.output_tokens,
    });

    const firstExchange =
      history.filter((item) => item.role === "user" || item.role === "assistant").length === 0;
    const expectedDefaultTitle = buildDefaultSessionTitle(game.name);
    const currentTitle = (session.title ?? "").trim() || expectedDefaultTitle;
    const canGenerateAiTitle = firstExchange && (session.title_source ?? "default") === "default" && currentTitle === expectedDefaultTitle;

    if (canGenerateAiTitle) {
      const aiTitle = await generateSessionTitleFromExchange({
        gameName: game.name,
        firstUserMessage: message,
        firstAssistantMessage: answer.text,
      });
      const updated = await updateSessionTitleIfDefault(sessionId, aiTitle, "ai");
      if (updated) {
        sessionTitle = aiTitle;
      }
    }

    return NextResponse.json({
      assistantMessage,
      userMessage,
      sessionTitle,
      rag: {
        chunks: answer.chunks,
      },
      online: {
        used: answer.usedOnlineSources,
        citations: answer.onlineCitations,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function parseChatRequest(req: Request): Promise<{ ok: true; value: ParsedChatRequest } | { ok: false; error: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const rawSessionId = formData.get("sessionId");
    const rawGameId = formData.get("gameId");
    const rawText = formData.get("text");
    const parsed = formSchema.safeParse({
      sessionId: typeof rawSessionId === "string" ? rawSessionId : undefined,
      gameId:
        rawGameId === "uno" || rawGameId === "uno-flip" || rawGameId === "mahjong" || rawGameId === "dune-imperium"
          ? rawGameId
          : undefined,
      text: typeof rawText === "string" ? rawText : undefined,
      useOnlineSources: formData.get("useOnlineSources") === "true",
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid multipart payload" };
    }

    const imageRaw = formData.get("image");
    const imageFile = imageRaw instanceof File && imageRaw.size > 0 ? imageRaw : undefined;
    const text = (parsed.data.text ?? "").trim();

    if (!text && !imageFile) {
      return { ok: false, error: "Please provide a message or an image." };
    }

    return {
      ok: true,
      value: {
        sessionId: parsed.data.sessionId,
        gameId: parsed.data.gameId,
        message: text || "What should I do next in this state?",
        imageFile,
        useOnlineSources: parsed.data.useOnlineSources ?? false,
      },
    };
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return { ok: false, error: "Invalid payload" };
  }

  return {
    ok: true,
    value: {
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      useOnlineSources: parsed.data.useOnlineSources ?? false,
    },
  };
}
