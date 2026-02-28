"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type GameCardProps = {
  id: string;
  name: string;
  category: string;
  accent: string;
  coverImageUrl?: string;
};

export function GameCard({ id, name, category, accent, coverImageUrl }: GameCardProps) {
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#161b2a] transition duration-300 hover:-translate-y-1 hover:border-[#f2aa4c]/55 hover:shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
      onClick={() => router.push(`/games/${id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/games/${id}`);
        }
      }}
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(242,170,76,0.35), transparent 40%), linear-gradient(135deg, #20273a 0%, #182035 55%, #141a2c 100%)",
        }}
      >
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={`${name} cover`}
            fill
            className="absolute inset-0 object-cover object-center [object-position:50%_50%]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6">
            <Image src="/logo.png" alt="PlayOnLeh" width={180} height={64} className="h-auto w-full max-w-[180px] object-contain" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 border border-white/8" />

        <div className="absolute left-3 top-3 pr-16">
          <p className="truncate text-sm font-semibold tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.7)] sm:text-base">
            {name}
          </p>
          <p className="truncate text-xs text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">{category}</p>
        </div>

        <button
          type="button"
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full text-[#121212] shadow-[0_8px_18px_rgba(0,0,0,0.45)] ring-1 ring-black/40 transition hover:scale-105"
          style={{ backgroundColor: accent }}
          aria-label={`Start Session for ${name}`}
          title="Start Session"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/setup/${id}`);
          }}
        >
          <Play className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
