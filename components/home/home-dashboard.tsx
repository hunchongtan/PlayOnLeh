"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GamePickerCombobox, GamePickerComboboxHandle } from "@/components/home/game-picker-combobox";
import { Greeting } from "@/components/home/greeting";
import { HomeComposer } from "@/components/home/home-composer";
import { RecentChatsList } from "@/components/home/recent-chats-list";
import { HouseRulesForm } from "@/components/house-rules/house-rules-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HomeGame, HomeRecentChat, HomeRecentGame } from "@/components/home/types";
import { validateChatImageFile } from "@/lib/chat/image-attachment";
import { getGameDefinition } from "@/lib/games/registry";
import { GameId } from "@/lib/games/types";
import { HouseRules } from "@/types/db";

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
  const pickerRef = useRef<GamePickerComboboxHandle | null>(null);
  const sendingLockRef = useRef(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [games, setGames] = useState<HomeGame[]>([]);
  const [sessions, setSessions] = useState<HomeRecentChat[]>([]);
  const [loading, setLoading] = useState(true);

  const [draftText, setDraftText] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [draftHouseRulesMode, setDraftHouseRulesMode] = useState<"standard" | "custom">("standard");
  const [draftHouseRulesJson, setDraftHouseRulesJson] = useState<HouseRules | Record<string, never>>({});
  const [draftHouseRulesSummary, setDraftHouseRulesSummary] = useState("Standard rules");

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
  const selectedGameDefinition = useMemo(() => {
    if (!selectedGameId) return null;
    return getGameDefinition(selectedGameId);
  }, [selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) return;
    setDraftHouseRulesMode("standard");
    setDraftHouseRulesJson({});
    setDraftHouseRulesSummary("Standard rules");
  }, [selectedGameId]);

  const canSend = (draftText.trim().length > 0 || Boolean(attachedImageFile)) && Boolean(selectedGameId);

  useEffect(() => {
    return () => {
      if (attachedImagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(attachedImagePreviewUrl);
      }
    };
  }, [attachedImagePreviewUrl]);

  function focusComposer() {
    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }

  function handleSelectGame(gameId: GameId) {
    setSelectedGameId(gameId);
    focusComposer();
  }

  function clearAttachedImage() {
    if (attachedImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
    }
    setAttachedImageFile(null);
    setAttachedImagePreviewUrl(null);
  }

  function handleFileSelection(file?: File) {
    if (!file) return;
    const validationError = validateChatImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (attachedImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
    }

    setAttachedImageFile(file);
    setAttachedImagePreviewUrl(URL.createObjectURL(file));

    if (!selectedGameId) {
      toast.message("Image attached. Pick a game to send.");
      pickerRef.current?.focusAndOpen();
    }
  }

  async function handleSend() {
    if (sendingLockRef.current || isSending) return;
    const trimmedMessage = draftText.trim();
    if (!trimmedMessage && !attachedImageFile) return;

    if (!selectedGameId) {
      pickerRef.current?.focusAndOpen();
      return;
    }

    const pendingImageFile = attachedImageFile;
    const effectiveMessage = trimmedMessage || "What should I do next in this state?";

    sendingLockRef.current = true;
    setIsSending(true);
    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGameId,
          houseRulesMode: draftHouseRulesMode,
          houseRules: draftHouseRulesMode === "custom" ? draftHouseRulesJson : undefined,
          houseRulesSummary: draftHouseRulesMode === "standard" ? "Standard rules" : draftHouseRulesSummary,
        }),
      });
      const sessionData = (await sessionRes.json()) as CreateSessionResponse & { error?: string };
      if (!sessionRes.ok || !sessionData.session?.id) {
        throw new Error(sessionData.error ?? "Failed to start a session");
      }

      const chatRes = pendingImageFile
        ? await fetch("/api/chat", {
            method: "POST",
            body: (() => {
              const formData = new FormData();
              formData.set("sessionId", sessionData.session.id);
              formData.set("gameId", selectedGameId);
              formData.set("text", trimmedMessage);
              formData.set("image", pendingImageFile);
              return formData;
            })(),
          })
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionData.session.id,
              message: effectiveMessage,
            }),
          });
      const chatData = (await chatRes.json()) as ChatResponse & { error?: string };
      if (!chatRes.ok || !chatData.assistantMessage?.id) {
        throw new Error(chatData.error ?? "Failed to send message");
      }

      setDraftText("");
      clearAttachedImage();
      router.push(`/session/${sessionData.session.id}`);
    } catch (error) {
      toast.error(normalizeError(error, "Failed to start session"));
    } finally {
      sendingLockRef.current = false;
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section className="space-y-3">
          <Greeting />
          <GamePickerCombobox
            ref={pickerRef}
            games={games}
            recentGames={recentGames}
            selectedGame={selectedGame}
            onSelectGame={handleSelectGame}
            onClear={() => setSelectedGameId(null)}
          />
          <HomeComposer
            value={draftText}
            onChange={setDraftText}
            onSubmit={handleSend}
            inputRef={composerRef}
            sendDisabled={!canSend}
            isSending={isSending}
            attachedImageFile={attachedImageFile}
            attachedImagePreviewUrl={attachedImagePreviewUrl}
            onPickUpload={() => uploadInputRef.current?.click()}
            onPickCamera={() => cameraInputRef.current?.click()}
            onClearAttachment={clearAttachedImage}
            showGameHint={!selectedGameId}
          />
          <div className="pl-1 text-xs text-white/55">
            {selectedGame ? (
              <button
                type="button"
                onClick={() => setRulesDialogOpen(true)}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 hover:bg-white/[0.05]"
              >
                {draftHouseRulesMode === "custom" ? "Rules: Custom (saved)" : "Rules: Standard"}
                <span className="text-white/45">(Configure)</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">
                Rules: Standard
                <span className="text-white/45">(select a game to customize)</span>
              </span>
            )}
          </div>
        </section>

        <RecentChatsList
          sessions={sessions}
          loading={loading}
          onDeleteSession={(sessionId) => setSessions((prev) => prev.filter((session) => session.id !== sessionId))}
        />
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleFileSelection(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleFileSelection(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[92vw] max-w-3xl overflow-y-auto rounded-2xl border-white/10 bg-[#181a20]">
          <DialogHeader>
            <DialogTitle>Configure House Rules</DialogTitle>
          </DialogHeader>
          {selectedGameDefinition ? (
            <HouseRulesForm
              game={selectedGameDefinition}
              flow="draft"
              initialDraft={{
                houseRulesMode: draftHouseRulesMode,
                houseRulesJson: draftHouseRulesJson,
                houseRulesSummary: draftHouseRulesSummary,
              }}
              onSaveDraft={(draft) => {
                setDraftHouseRulesMode(draft.houseRulesMode);
                setDraftHouseRulesJson(draft.houseRulesJson);
                setDraftHouseRulesSummary(draft.houseRulesSummary);
                setRulesDialogOpen(false);
                toast.success("Draft rules saved");
              }}
              onCancelDraft={() => setRulesDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
