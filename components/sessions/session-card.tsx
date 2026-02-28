"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveSessionTitle } from "@/lib/sessions/title";
import { SessionListItem } from "@/types/db";
import { toast } from "sonner";

export function SessionCard({
  session,
  href,
  onDelete,
}: {
  session: SessionListItem;
  href?: string;
  onDelete?: (sessionId: string) => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const targetHref = href ?? `/session/${session.id}`;
  const gameName = session.game_name ?? prettyGameName(session.game_id);
  const title = resolveSessionTitle({ title: session.title, gameName });
  const rulesModeLabel = session.house_rules_mode === "custom" ? "Custom Rules" : "Standard Rules";

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete session");
      }
      toast.success("Session deleted");
      setConfirmOpen(false);
      onDelete?.(session.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(targetHref)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            router.push(targetHref);
          }
        }}
        className="group cursor-pointer rounded-xl border border-white/10 bg-[#181a20] p-3 transition hover:bg-[#1d2030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2aa4c]/60"
        title={session.house_rules_summary?.trim() || undefined}
      >
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#232838]">
            {session.cover_image_url ? (
              <Image src={session.cover_image_url} alt={`${title} cover`} fill className="object-cover object-center" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_20%_20%,rgba(242,170,76,0.35),transparent_45%),linear-gradient(160deg,#23283a,#171c2a)]">
                <MessageSquareText className="h-4 w-4 text-white/70" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{title}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-[11px] text-white/50">{relativeTime(session.updated_at)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete session"
                  className="h-8 w-8 text-white/50 opacity-70 transition hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/60">
              <SlidersHorizontal className="h-3 w-3" />
              <span>{rulesModeLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[92vw] max-w-md rounded-2xl border-white/10 bg-[#181a20] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription className="text-white/70">
              This will permanently remove the session and its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function prettyGameName(gameId: string) {
  if (gameId === "uno") return "Uno";
  if (gameId === "uno-flip") return "Uno Flip";
  if (gameId === "mahjong") return "Mahjong";
  return gameId;
}

function relativeTime(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diffMs = Date.now() - time;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}
