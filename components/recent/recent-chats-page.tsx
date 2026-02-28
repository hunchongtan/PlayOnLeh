"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionCard } from "@/components/sessions/session-card";
import { SessionListItem } from "@/types/db";

export function RecentChatsPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/sessions?limit=100", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error();
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
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Recent Chats</h1>
        <p className="mt-1 text-sm text-white/65">Continue previous rule sessions.</p>
      </div>

      {loading ? <p className="text-sm text-white/60">Loading chats...</p> : null}

      {!loading && sessions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/70">No chats yet.</p>
          <Link href="/games" className="mt-3 inline-flex text-sm text-[#f8c57d] hover:underline">
            Browse games
          </Link>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onDelete={(sessionId) => setSessions((prev) => prev.filter((item) => item.id !== sessionId))}
          />
        ))}
      </div>
    </div>
  );
}
