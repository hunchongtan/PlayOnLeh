import { NextResponse } from "next/server";
import { z } from "zod";
import { getHouseRuleSummary } from "@/lib/games/registry";
import { deleteSessionById, getMessagesForSession, getSessionById, updateSessionHouseRules } from "@/lib/supabase/dal";
import { houseRulesSchema } from "@/types/db";

const patchSessionSchema = z.object({
  houseRulesMode: z.enum(["standard", "custom"]),
  houseRules: houseRulesSchema.optional(),
  houseRulesSummary: z.string().max(4000).optional(),
}).superRefine((value, ctx) => {
  if (value.houseRulesMode === "custom" && !value.houseRules) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "houseRules are required for custom mode",
      path: ["houseRules"],
    });
  }
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getSessionById(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await getMessagesForSession(id);

    return NextResponse.json({
      session,
      messages,
      feedbackCount: {
        up: 0,
        down: 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const deleted = await deleteSessionById(id);
    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getSessionById(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const isStandard = parsed.data.houseRulesMode === "standard";
    const summary = isStandard
      ? parsed.data.houseRulesSummary?.trim() || "Standard rules"
      : parsed.data.houseRulesSummary ?? getHouseRuleSummary(session.game_id, parsed.data.houseRules ?? {}).summary;

    const updated = await updateSessionHouseRules(id, {
      houseRulesMode: parsed.data.houseRulesMode,
      houseRules: isStandard ? {} : parsed.data.houseRules ?? {},
      houseRulesSummary: summary,
    });

    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
