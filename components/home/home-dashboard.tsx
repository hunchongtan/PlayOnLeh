"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrowseModal } from "@/components/home/browse-modal";
import { Greeting } from "@/components/home/greeting";
import { HomeComposer } from "@/components/home/home-composer";
import { RecentChatsList } from "@/components/home/recent-chats-list";
import { RecentGamesRow } from "@/components/home/recent-games-row";
import { SelectedGameSlot } from "@/components/home/selected-game-slot";
import { HomeGame, HomeRecentChat, HomeRecentGame } from "@/components/home/types";
import { GameId } from "@/lib/games/types";

type CreateSessionResponse = {
  session: {
    id: string;
  };
};

type ChatResponse = {
  assistantMessage: {
    id: string;
  };
};

function normalizeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function HomeDashboard() {
  const router = useRouter();
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const [games, setGames] = useState<HomeGame[]>([]);
  const [sessions, setSessions] = useState<HomeRecentChat[]>([]);
  const [loading, setLoading] = useState(true);

  const [draftText, setDraftText] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [gamesRes, sessionsRes] = await Promise.all([
          fetch("/api/games", { cache: "no-store" }),
          fetch("/api/sessions?limit=30", { cache: "no-store" }),
        ]);

        const [gamesData, sessionsData] = await Promise.all([gamesRes.json(), sessionsRes.json()]);

        if (!gamesRes.ok) {
          throw new Error(gamesData.error ?? "Failed to load games");
        }
        if (!sessionsRes.ok) {
          throw new Error(sessionsData.error ?? "Failed to load sessions");
        }

        if (cancelled) return;

        setGames((gamesData.games ?? []) as HomeGame[]);
        setSessions((sessionsData.sessions ?? []) as HomeRecentChat[]);
      } catch (error) {
        if (!cancelled) {
          setGames([]);
          setSessions([]);
          toast.error(normalizeError(error, "Failed to load home data"));
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

  const recentGames = useMemo(() => {
    const seen = new Set<string>();
    const rows: HomeRecentGame[] = [];

    for (const session of sessions) {
      if (seen.has(session.game_id)) continue;
      seen.add(session.game_id);
      rows.push({
        gameId: session.game_id,
        gameName: session.game_name ?? session.game_id,
        coverImageUrl: session.cover_image_url,
      });
      if (rows.length >= 4) break;
    }

    return rows;
  }, [sessions]);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null;
    const game = games.find((item) => item.id === selectedGameId);
    if (game) return game;
    const recent = recentGames.find((item) => item.gameId === selectedGameId);
    if (!recent) return null;
    return {
      id: recent.gameId,
      name: recent.gameName,
      category: "Game",
      coverImageUrl: recent.coverImageUrl ?? undefined,
    };
  }, [games, recentGames, selectedGameId]);

  const canSend = draftText.trim().length > 0 && Boolean(selectedGameId);

  function focusComposer() {
    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }

  function handleSelectGame(gameId: GameId) {
    setSelectedGameId(gameId);
    setBrowseOpen(false);
    focusComposer();
  }

  async function handleSend() {
    const trimmedMessage = draftText.trim();
    if (!trimmedMessage) return;

    if (!selectedGameId) {
      setBrowseOpen(true);
      return;
    }

    setIsSending(true);
    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGameId,
          houseRulesMode: "standard",
        }),
      });
      const sessionData = (await sessionRes.json()) as CreateSessionResponse & { error?: string };
      if (!sessionRes.ok || !sessionData.session?.id) {
        throw new Error(sessionData.error ?? "Failed to start a session");
      }

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionData.session.id,
          message: trimmedMessage,
        }),
      });
      const chatData = (await chatRes.json()) as ChatResponse & { error?: string };
      if (!chatRes.ok || !chatData.assistantMessage?.id) {
        throw new Error(chatData.error ?? "Failed to send message");
      }

      setDraftText("");
      router.push(`/session/${sessionData.session.id}`);
    } catch (error) {
      toast.error(normalizeError(error, "Failed to start session"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section className="space-y-3">
          <Greeting />
          <SelectedGameSlot
            selectedGame={selectedGame}
            onOpenPicker={() => setBrowseOpen(true)}
            onClear={() => setSelectedGameId(null)}
          />
          <HomeComposer
            value={draftText}
            onChange={setDraftText}
            onSubmit={handleSend}
            inputRef={composerRef}
            sendDisabled={!canSend}
            isSending={isSending}
          />
        </section>

        <RecentGamesRow games={recentGames} onSelectGame={handleSelectGame} onOpenBrowse={() => setBrowseOpen(true)} />

        <RecentChatsList
          sessions={sessions}
          loading={loading}
          onDeleteSession={(sessionId) => setSessions((prev) => prev.filter((session) => session.id !== sessionId))}
        />
      </div>

      <BrowseModal open={browseOpen} onOpenChange={setBrowseOpen} games={games} onSelectGame={handleSelectGame} />
    </>
  );
}
