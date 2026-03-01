"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, Gamepad2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeGame, HomeRecentGame } from "@/components/home/types";
import { GameId } from "@/lib/games/types";
import { useScanGame } from "@/components/layout/scan-game-context";

export type GamePickerComboboxHandle = {
  focusAndOpen: () => void;
};

const SUPPORTED_GAME_IDS: GameId[] = ["uno", "uno-flip", "mahjong", "dune-imperium"];

function isGameId(value: string): value is GameId {
  return SUPPORTED_GAME_IDS.includes(value as GameId);
}

function RecentRow({
  recentGames,
  onSelectGame,
}: {
  recentGames: HomeRecentGame[];
  onSelectGame: (gameId: GameId) => void;
}) {
  if (!recentGames.length) return null;

  return (
    <div className="space-y-2 border-b border-white/10 px-2 py-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Recent</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {recentGames.slice(0, 6).map((game) => (
          <button
            key={`recent-${game.gameId}`}
            type="button"
            onClick={() => onSelectGame(game.gameId)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-left transition hover:bg-white/[0.08]"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#1b2131]">
              {game.coverImageUrl ? (
                <Image src={game.coverImageUrl} alt={`${game.gameName} cover`} fill className="object-cover object-center" />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(160deg,#21273a,#171c2c)]" />
              )}
            </div>
            <span className="truncate text-xs font-medium text-white/90">{game.gameName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const GamePickerCombobox = forwardRef<
  GamePickerComboboxHandle,
  {
    games: HomeGame[];
    recentGames: HomeRecentGame[];
    selectedGame: HomeGame | null;
    onSelectGame: (gameId: GameId) => void;
    onClear: () => void;
  }
>(function GamePickerCombobox({ games, recentGames, selectedGame, onSelectGame, onClear }, ref) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scanGame = useScanGame();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useImperativeHandle(ref, () => ({
    focusAndOpen() {
      setOpen(true);
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filteredGames = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return games;
    return games.filter((game) => `${game.name} ${game.category}`.toLowerCase().includes(term));
  }, [games, query]);

  const inputValue = open ? query : selectedGame?.name ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div className="flex h-11 items-center rounded-xl border border-white/15 bg-white/[0.04] px-2.5">
        <Gamepad2 className="mr-2 h-4 w-4 shrink-0 text-[#f2aa4c]" />
        {selectedGame && !open ? (
          <div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#1e2332]">
              {selectedGame.coverImageUrl ? (
                <Image src={selectedGame.coverImageUrl} alt={`${selectedGame.name} cover`} fill className="object-cover object-center" />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(160deg,#21273a,#171c2c)]" />
              )}
            </div>
            <input
              ref={inputRef}
              value={inputValue}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              placeholder="Select a game to start..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            value={inputValue}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            placeholder="Select a game to start..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
          />
        )}

        {selectedGame ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear selected game"
            className="mr-0.5 h-8 w-8 text-white/65 hover:bg-white/10 hover:text-white"
            onClick={() => {
              onClear();
              setQuery("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Scan Game"
          className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() =>
            scanGame?.openScanGame({
              source: "input",
              openCamera: true,
              onSelectGame: (gameId) => {
                if (!isGameId(gameId)) return;
                onSelectGame(gameId);
                setOpen(false);
                setQuery("");
              },
            })
          }
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Close game list" : "Open game list"}
          className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-[420px] overflow-y-auto rounded-xl border border-white/12 bg-[#141a2b] p-2 shadow-2xl">
          <RecentRow
            recentGames={recentGames}
            onSelectGame={(gameId) => {
              onSelectGame(gameId);
              setOpen(false);
              setQuery("");
            }}
          />

          <div className="space-y-1 px-2 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
              {query.trim() ? "Matching games" : "All games"}
            </p>
            {filteredGames.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/60">
                <Search className="h-4 w-4" />
                No games match.
              </div>
            ) : (
              filteredGames.map((game) => (
                <button
                  key={`game-${game.id}`}
                  type="button"
                  onClick={() => {
                    onSelectGame(game.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.08]"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#1b2131]">
                    {game.coverImageUrl ? (
                      <Image src={game.coverImageUrl} alt={`${game.name} cover`} fill className="object-cover object-center" />
                    ) : (
                      <div className="h-full w-full bg-[linear-gradient(160deg,#21273a,#171c2c)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{game.name}</p>
                    <p className="truncate text-xs text-white/60">{game.category}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
});
