"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { SessionCard } from "@/components/sessions/session-card";
import { HomeRecentChat } from "@/components/home/types";

export function RecentChatsList({
  sessions,
  loading,
  onDeleteSession,
}: {
  sessions: HomeRecentChat[];
  loading: boolean;
  onDeleteSession: (sessionId: string) => void;
}) {
  return (
    <section className="space-y-3 border-t border-white/10 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-white/65" />
          <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-white/65">Recent Chats</h2>
        </div>
        <Link href="/recent-chats" className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? <p className="text-sm text-white/60">Loading chats...</p> : null}
      {!loading && sessions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">No chats yet.</p>
      ) : null}

      <div className="space-y-2">
        {sessions.slice(0, 3).map((session) => (
          <SessionCard key={session.id} session={session} onDelete={onDeleteSession} />
        ))}
      </div>
    </section>
  );
}
