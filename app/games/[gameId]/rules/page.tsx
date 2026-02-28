import { notFound } from "next/navigation";
import { RulesReader } from "@/components/games/rules/rules-reader";
import { getGameDefinition } from "@/lib/games/registry";
import { generateRulesSummary } from "@/lib/openai/tasks";

export default async function GameRulesPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = getGameDefinition(gameId);

  if (!game) {
    notFound();
  }

  const summary = await generateRulesSummary({ gameId: game.id, gameName: game.name });

  return <RulesReader game={game} summaryText={summary.summaryText} />;
}
