"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionCard } from "@/components/sessions/session-card";
import { SessionListItem } from "@/types/db";
import { GameId } from "@/lib/games/types";

export function GameSessionsPage({
  gameId,
  gameName,
}: {
  gameId: GameId;
  gameName: string;
}) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/sessions?limit=100&gameId=${gameId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load sessions");
        if (!cancelled) {
          setSessions((data.sessions ?? []) as SessionListItem[]);
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
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
  }, [gameId]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{gameName} My Sessions</h1>
          <p className="mt-1 text-sm text-white/65">Open an existing session or start a fresh one.</p>
        </div>
        <Link
          href={`/setup/${gameId}`}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#f2aa4c] px-5 text-sm font-medium text-[#121212] transition hover:bg-[#f6ba67]"
        >
          Start Session
        </Link>
      </div>

      {loading ? <p className="text-sm text-white/60">Loading sessions...</p> : null}

      {!loading && sessions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/70">No sessions for this game yet.</p>
          <Link href={`/setup/${gameId}`} className="mt-3 inline-flex text-sm text-[#f8c57d] hover:underline">
            Start Session
          </Link>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={{ ...session, game_name: gameName }}
            onDelete={(sessionId) => setSessions((prev) => prev.filter((item) => item.id !== sessionId))}
          />
        ))}
      </div>
    </div>
  );
}
