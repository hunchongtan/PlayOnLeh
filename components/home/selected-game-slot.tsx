"use client";

import Image from "next/image";
import { Gamepad2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeGame } from "@/components/home/types";

export function SelectedGameSlot({
  selectedGame,
  onOpenPicker,
  onClear,
}: {
  selectedGame: HomeGame | null;
  onOpenPicker: () => void;
  onClear: () => void;
}) {
  if (!selectedGame) {
    return (
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-3 text-sm text-white/70 transition hover:border-white/35 hover:bg-white/[0.06]"
        onClick={onOpenPicker}
      >
        <span className="inline-flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-[#f2aa4c]" />
          Select a game
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-white/60">
          Browse
          <Search className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-2.5">
      <button
        type="button"
        onClick={onOpenPicker}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/[0.04]"
      >
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#1e2332]">
          {selectedGame.coverImageUrl ? (
            <Image src={selectedGame.coverImageUrl} alt={`${selectedGame.name} cover`} fill className="object-cover object-center" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(160deg,#21273a,#171c2c)]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-white/55">Selected game</p>
          <p className="truncate text-sm font-medium text-white">{selectedGame.name}</p>
        </div>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-8 w-8 shrink-0 rounded-md text-white/65 hover:bg-white/10 hover:text-white"
        aria-label="Clear selected game"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
