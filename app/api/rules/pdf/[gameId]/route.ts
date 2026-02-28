import { NextResponse } from "next/server";
import { getGameDefinition } from "@/lib/games/registry";
import { buildPublicStorageUrl, getGameRecord } from "@/lib/supabase/dal";

export async function GET(_: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await context.params;
    const game = getGameDefinition(gameId);

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const gameRecord = await getGameRecord(game.id);
    if (!gameRecord?.storage_bucket || !gameRecord.rules_pdf_object_path) {
      return NextResponse.json(
        { error: "Rules PDF storage path is not configured for this game." },
        { status: 500 }
      );
    }

    const publicUrl = buildPublicStorageUrl(gameRecord.storage_bucket, gameRecord.rules_pdf_object_path);
    return NextResponse.redirect(publicUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
