"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Camera, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useScanGame } from "@/components/layout/scan-game-context";
import { GameId } from "@/lib/games/types";
import { HomeGame } from "@/components/home/types";

const SUPPORTED_GAME_IDS: GameId[] = ["uno", "uno-flip", "mahjong"];

function isGameId(value: string): value is GameId {
  return SUPPORTED_GAME_IDS.includes(value as GameId);
}

export function BrowseModal({
  open,
  onOpenChange,
  games,
  onSelectGame,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: HomeGame[];
  onSelectGame: (gameId: GameId) => void;
}) {
  const [search, setSearch] = useState("");
  const scanGame = useScanGame();

  const filteredGames = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return games;
    return games.filter((game) => `${game.name} ${game.category}`.toLowerCase().includes(term));
  }, [games, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
    >
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-3xl overflow-hidden rounded-2xl border-white/10 bg-[#141a2b] p-0 text-white shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Choose a game</DialogTitle>
            <DialogDescription className="text-white/70">
              Select a game context first. Your session will start only when you send your message.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games..."
                className="h-10 border-white/15 bg-white/5 pl-9 text-white placeholder:text-white/50"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() =>
                scanGame?.openScanGame({
                  onSelectGame: (gameId) => {
                    if (!isGameId(gameId)) return;
                    onSelectGame(gameId);
                    onOpenChange(false);
                  },
                })
              }
            >
              <Camera className="mr-2 h-4 w-4" />
              Scan Game
            </Button>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
          {filteredGames.length === 0 ? <p className="text-sm text-white/65">No games match your search.</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  onSelectGame(game.id);
                  onOpenChange(false);
                }}
                className="group overflow-hidden rounded-xl border border-white/10 bg-[#1a2134] text-left transition hover:-translate-y-0.5 hover:border-[#f2aa4c]/45"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {game.coverImageUrl ? (
                    <Image src={game.coverImageUrl} alt={`${game.name} cover`} fill className="object-cover object-center" />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(160deg,#21273a,#171c2c)]" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                </div>
                <div className="px-2.5 py-2.5">
                  <p className="truncate text-sm font-medium text-white">{game.name}</p>
                  <p className="truncate text-xs text-white/65">{game.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
