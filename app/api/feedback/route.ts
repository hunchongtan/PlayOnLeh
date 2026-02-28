import { NextResponse } from "next/server";
import { z } from "zod";
import { createFeedback, getSessionById } from "@/lib/supabase/dal";

const feedbackSchema = z.object({
  sessionId: z.string().uuid(),
  messageId: z.string().uuid(),
  sentiment: z.enum(["up", "down"]),
  reason: z.enum(["incorrect_ruling", "missing_information", "unclear_explanation", "other"]).optional(),
  details: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const session = await getSessionById(parsed.data.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await createFeedback({
      sessionId: parsed.data.sessionId,
      messageId: parsed.data.messageId,
      gameId: session.game_id,
      sentiment: parsed.data.sentiment,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
