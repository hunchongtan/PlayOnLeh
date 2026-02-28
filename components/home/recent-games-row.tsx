"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { HomeGame, HomeRecentGame } from "@/components/home/types";

function RecentGameCard({
  game,
  onSelect,
}: {
  game: HomeRecentGame;
  onSelect: (gameId: HomeGame["id"]) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(game.gameId)}
      className="group relative aspect-square overflow-hidden rounded-xl border border-white/12 bg-[#161b2a] text-left transition hover:-translate-y-0.5 hover:border-[#f2aa4c]/50"
      aria-label={`Select ${game.gameName}`}
    >
      {game.coverImageUrl ? (
        <Image src={game.coverImageUrl} alt={`${game.gameName} cover`} fill className="object-cover object-center" />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(242,170,76,0.35),transparent_45%),linear-gradient(160deg,#21273a,#171c2c)]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-black/35 px-2 py-1 text-[11px] font-medium text-white/95 backdrop-blur-sm">
        {game.gameName}
      </span>
    </button>
  );
}

function EmptyGameSlot() {
  return <div className="aspect-square rounded-xl border border-dashed border-white/12 bg-white/[0.02]" aria-hidden />;
}

function BrowseCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid aspect-square place-items-center rounded-xl border border-dashed border-white/25 bg-white/[0.03] transition hover:border-[#f2aa4c]/60 hover:bg-white/[0.06]"
      aria-label="Browse all games"
    >
      <div className="text-center">
        <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-[#f2aa4c]">
          <Search className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-white">Browse</p>
      </div>
    </button>
  );
}

export function RecentGamesRow({
  games,
  onSelectGame,
  onOpenBrowse,
}: {
  games: HomeRecentGame[];
  onSelectGame: (gameId: HomeGame["id"]) => void;
  onOpenBrowse: () => void;
}) {
  const firstFour = games.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-white/65">Recent Games</h2>
      </div>
      <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
        {Array.from({ length: 4 }).map((_, index) => {
          const game = firstFour[index];
          if (!game) {
            return <EmptyGameSlot key={`empty-${index}`} />;
          }
          return <RecentGameCard key={game.gameId} game={game} onSelect={onSelectGame} />;
        })}
        <BrowseCard onClick={onOpenBrowse} />
      </div>
    </section>
  );
}
