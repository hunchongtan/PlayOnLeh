import Link from "next/link";
import Image from "next/image";
import { Clock3, Play, Users, ShieldCheck, BookOpenText, History } from "lucide-react";
import { GameDefinition } from "@/lib/games/types";

export function GameDetail({ game, coverImageUrl }: { game: GameDefinition; coverImageUrl?: string }) {
  const category = game.id === "mahjong" ? "Tile Game" : game.id === "dune-imperium" ? "Board Game" : "Card Game";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <section className="space-y-5">
        <div className="relative h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#181a20] sm:h-[340px]">
          <Image
            src={coverImageUrl ?? "/logo.png"}
            alt={`${game.name} cover`}
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" />

          <div className="absolute inset-x-0 top-0 p-5 sm:p-7">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{game.name}</h1>
              <p className="mt-1 text-sm font-medium text-white/75">{category}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-[#181a20] p-5 sm:p-7">
          <p className="max-w-3xl text-sm leading-6 text-white/70">{game.description}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/setup/${game.id}`}
              className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#f2aa4c] px-5 text-sm font-medium text-[#121212] transition hover:bg-[#f6ba67]"
            >
              <Play className="h-4 w-4" />
              Start Session
            </Link>
            <Link
              href={`/games/${game.id}/sessions`}
              className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-transparent px-5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <History className="h-4 w-4" />
              My Sessions
            </Link>
            <Link
              href={`/games/${game.id}/rules`}
              className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-transparent px-5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <BookOpenText className="h-4 w-4" />
              Rules
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white/90">
              <Users className="h-4 w-4 text-[#f8c57d]" />
              <span>{game.metadata.players}</span>
            </div>
            <div className="flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white/90">
              <Clock3 className="h-4 w-4 text-[#f8c57d]" />
              <span>{game.metadata.duration}</span>
            </div>
            <div className="flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white/90">
              <ShieldCheck className="h-4 w-4 text-[#f8c57d]" />
              <span>{game.metadata.age}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-white">Expansions</h2>
        <div className="rounded-2xl border border-white/10 bg-[#181a20] p-6 text-sm text-white/65">Coming soon</div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-white">Strategy Tips</h2>
        <div className="rounded-2xl border border-white/10 bg-[#181a20] p-6 text-sm text-white/65">Coming soon</div>
      </section>
    </div>
  );
}
