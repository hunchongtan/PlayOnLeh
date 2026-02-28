import { notFound } from "next/navigation";
import { GameSessionsPage } from "@/components/games/game-sessions-page";
import { getGameDefinition } from "@/lib/games/registry";

export default async function GameSessionsRoute({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = getGameDefinition(gameId);

  if (!game) {
    notFound();
  }

  return <GameSessionsPage gameId={game.id} gameName={game.name} />;
}

