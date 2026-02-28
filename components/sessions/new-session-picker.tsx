"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleDashed } from "lucide-react";
import { GameId } from "@/lib/games/types";

type GameItem = {
  id: GameId;
  name: string;
  coverImageUrl?: string;
};

export function NewSessionPicker() {
  const router = useRouter();
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
          setGames((data.games ?? []) as GameItem[]);
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Select a game to start</h1>
        <p className="text-sm text-white/65">We&apos;ll start a fresh session.</p>
      </header>

      {loading ? <p className="text-sm text-white/60">Loading games...</p> : null}

      {!loading && games.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-12 text-center">
          <CircleDashed className="mb-3 h-8 w-8 text-white/60" />
          <p className="text-sm text-white/70">No games available yet.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => router.push(`/setup/${game.id}`)}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-[#161b2a] text-left transition hover:-translate-y-1 hover:border-[#f2aa4c]/60 hover:shadow-[0_14px_30px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2aa4c]"
            aria-label={`Start Session for ${game.name}`}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src={game.coverImageUrl ?? "/logo.png"}
                alt={`${game.name} cover`}
                fill
                className="object-cover object-center"
              />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold text-white">{game.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
