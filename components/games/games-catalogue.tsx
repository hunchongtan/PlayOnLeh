"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CircleDashed, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/landing/game-card";
import { useScanGame } from "@/components/layout/scan-game-context";
import { GameId } from "@/lib/games/types";

type GameItem = {
  id: GameId;
  name: string;
  category: string;
  accent: string;
  coverImageUrl?: string;
};

export function GamesCatalogue() {
  const scanGame = useScanGame();
  const [search, setSearch] = useState("");
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load games");
        if (!cancelled) {
          setGames(
            (data.games ?? []).map((game: Omit<GameItem, "accent">) => ({
              ...game,
              accent: "#f2aa4c",
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setGames([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGames = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return games;
    return games.filter((game) => `${game.name} ${game.category}`.toLowerCase().includes(term));
  }, [games, search]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search games..."
            className="h-11 border-white/15 bg-white/5 pl-9 pr-12 text-white placeholder:text-white/50"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Scan Game"
            onClick={() =>
              scanGame?.openScanGame({
                source: "input",
                onSelectGame: (gameId) => {
                  const selected = games.find((game) => game.id === gameId);
                  if (!selected) return;
                  setSearch(selected.name);
                },
              })
            }
            className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#f2aa4c]/70" />
        <h1 className="text-2xl font-semibold italic tracking-tight text-[#f2aa4c] sm:text-4xl">Games Catalogue</h1>
        <Badge className="bg-[#f2aa4c]/15 text-[#f8c57d]">({filteredGames.length})</Badge>
        <div className="h-px flex-1 bg-[#f2aa4c]/70" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredGames.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            name={game.name}
            category={game.category}
            accent={game.accent}
            coverImageUrl={game.coverImageUrl}
          />
        ))}
      </div>

      {!loading && filteredGames.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-12 text-center">
          <CircleDashed className="mb-3 h-8 w-8 text-white/60" />
          <p className="text-sm text-white/70">No games match your search.</p>
        </div>
      ) : null}
    </div>
  );
}
