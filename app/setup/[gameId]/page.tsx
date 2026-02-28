import { notFound } from "next/navigation";
import { HouseRulesForm } from "@/components/house-rules/house-rules-form";
import { getGameDefinition } from "@/lib/games/registry";

export default async function SetupPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = getGameDefinition(gameId);

  if (!game) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Configure House Rules</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stick to standard rules, or customize how your group plays.</p>
      </header>
      <HouseRulesForm game={game} />
    </main>
  );
}
