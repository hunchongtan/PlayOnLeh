import { GameDefinition } from "@/lib/games/types";

function sanitizeSummaryText(text: string): string {
  return text
    .replace(/\[[^\]]*Rules,\s*chunk\s*\d+\]/gi, "")
    .replace(/\[chunk\s*\d+\]/gi, "")
    .replace(/\(chunk\s*\d+\)/gi, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function RulesReader({ game, summaryText }: { game: GameDefinition; summaryText: string }) {
  const summary = sanitizeSummaryText(summaryText) || "Not enough context to summarise confidently.";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-2xl border border-white/10 bg-[#181a20] p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-white">{game.name} Rules</h1>
        <p className="mt-1 text-sm text-white/65">summarised by AI. Please refer to the actual rule book below.</p>

        <p className="mt-4 text-sm leading-relaxed text-white/85">{summary}</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111826]">
        <iframe
          src={`/api/rules/pdf/${game.id}`}
          className="h-[70vh] w-full"
          title={`${game.name} official rulebook`}
        />
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#181a20] p-5">
        <h2 className="text-xl font-semibold italic text-[#f8c57d]">Related</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">Expansions</p>
            <p className="mt-1 text-sm text-white/60">Coming soon</p>
          </div>
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">Strategy Tips</p>
            <p className="mt-1 text-sm text-white/60">Coming soon</p>
          </div>
        </div>
      </section>
    </div>
  );
}
