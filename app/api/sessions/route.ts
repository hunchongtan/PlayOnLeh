import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getRecentSessions } from "@/lib/supabase/dal";
import { getGameDefinition, getHouseRuleSummary, getStandardRulesSummary } from "@/lib/games/registry";
import { buildDefaultSessionTitle } from "@/lib/sessions/title";
import { houseRulesSchema } from "@/types/db";

const createSessionSchema = z.object({
  gameId: z.enum(["uno", "uno-flip", "mahjong"]),
  houseRulesMode: z.enum(["standard", "custom"]),
  houseRules: houseRulesSchema.optional(),
  houseRulesSummary: z.string().max(4000).optional(),
  title: z.string().max(100).optional(),
}).superRefine((value, ctx) => {
  if (value.houseRulesMode === "custom" && !value.houseRules) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "houseRules are required for custom mode",
      path: ["houseRules"],
    });
  }
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, Math.floor(limitParam))) : 20;
    const gameIdParam = searchParams.get("gameId");
    const gameId = gameIdParam === "uno" || gameIdParam === "uno-flip" || gameIdParam === "mahjong" ? gameIdParam : undefined;
    const sessions = await getRecentSessions(limit, gameId);
    return NextResponse.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const isStandard = parsed.data.houseRulesMode === "standard";
    const summary = isStandard
      ? getStandardRulesSummary(parsed.data.gameId).summary
      : parsed.data.houseRulesSummary ?? getHouseRuleSummary(parsed.data.gameId, parsed.data.houseRules ?? {}).summary;
    const game = getGameDefinition(parsed.data.gameId);
    const title = parsed.data.title ?? buildDefaultSessionTitle(game?.name ?? parsed.data.gameId);
    const session = await createSession({
      gameId: parsed.data.gameId,
      houseRulesMode: parsed.data.houseRulesMode,
      houseRules: isStandard ? {} : parsed.data.houseRules ?? {},
      houseRulesSummary: summary,
      title,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
