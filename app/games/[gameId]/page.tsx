import { notFound } from "next/navigation";
import { GameDetail } from "@/components/games/detail/game-detail";
import { getGameDefinition } from "@/lib/games/registry";
import { buildPublicStorageUrl, getGameRecord } from "@/lib/supabase/dal";

export default async function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = getGameDefinition(gameId);

  if (!game) {
    notFound();
  }

  const gameRecord = await getGameRecord(game.id);
  const coverImageUrl =
    gameRecord?.storage_bucket && gameRecord.cover_object_path
      ? buildPublicStorageUrl(gameRecord.storage_bucket, gameRecord.cover_object_path)
      : undefined;

  return <GameDetail game={game} coverImageUrl={coverImageUrl} />;
}
