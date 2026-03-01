"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Paperclip, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FeedbackSheet } from "@/components/chat/feedback-sheet";
import { HouseRulesForm } from "@/components/house-rules/house-rules-form";
import { validateChatImageFile } from "@/lib/chat/image-attachment";
import { readOnlineSourcesPreference } from "@/lib/client/preferences";
import { getGameDefinition, getStandardRulesSummary } from "@/lib/games/registry";
import { resolveSessionTitle } from "@/lib/sessions/title";
import { MessageRecord, SessionRecord } from "@/types/db";
import { toast } from "sonner";

type Message = Pick<MessageRecord, "id" | "role" | "content" | "created_at" | "image_url" | "image_mime">;
type RulesChangedEvent = {
  id: string;
  type: "rules_changed";
  text: string;
  created_at: string;
};

export function ChatSessionClient({
  initialSession,
  initialMessages,
  initialFeedbackByMessage,
}: {
  initialSession: SessionRecord;
  initialMessages: Message[];
  initialFeedbackByMessage: Record<string, "up" | "down">;
}) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionRecord>(initialSession);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [rulesChangedEvents, setRulesChangedEvents] = useState<RulesChangedEvent[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [rulesEditorOpen, setRulesEditorOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(() =>
    resolveSessionTitle({
      title: initialSession.title,
      gameName: getGameDefinition(initialSession.game_id)?.name ?? initialSession.game_id,
    })
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, "up" | "down">>(initialFeedbackByMessage);
  const [pendingFeedback, setPendingFeedback] = useState<{
    messageId: string;
    sentiment: "up" | "down";
    previous?: "up" | "down";
    submitted: boolean;
  } | null>(null);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null);
  const [useOnlineSources, setUseOnlineSources] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const gameDefinition = useMemo(() => getGameDefinition(sessionState.game_id), [sessionState.game_id]);
  const timelineItems = useMemo(() => {
    const messageItems = messages.map((message) => ({ type: "message" as const, created_at: message.created_at, message }));
    const eventItems = rulesChangedEvents.map((event) => ({ type: "event" as const, created_at: event.created_at, event }));
    return [...messageItems, ...eventItems].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, rulesChangedEvents]);

  const summaryBullets = useMemo(() => {
    const raw = (sessionState.house_rules_summary ?? "").trim();
    if (!raw) {
      return getStandardRulesSummary(sessionState.game_id).bullets;
    }
    return parseSummaryBullets(raw);
  }, [sessionState.game_id, sessionState.house_rules_summary]);
  const rulesModeLabel = (sessionState.house_rules_mode ?? "standard") === "custom" ? "Custom" : "Standard";
  useEffect(() => {
    setUseOnlineSources(readOnlineSourcesPreference());
  }, []);

  useEffect(() => {
    return () => {
      if (attachedImagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(attachedImagePreviewUrl);
      }
    };
  }, [attachedImagePreviewUrl]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if ((!text && !attachedImageFile) || isSending) return;

    const pendingImageFile = attachedImageFile;
    const pendingPreviewUrl = attachedImagePreviewUrl;
    const effectiveMessage = text || "What should I do next in this state?";

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: effectiveMessage,
      created_at: new Date().toISOString(),
      image_url: pendingPreviewUrl ?? null,
      image_mime: pendingImageFile?.type ?? null,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setAttachedImageFile(null);
    setAttachedImagePreviewUrl(null);
    setIsSending(true);

    try {
      const res = pendingImageFile
        ? await fetch("/api/chat", {
            method: "POST",
            body: (() => {
              const formData = new FormData();
              formData.set("sessionId", initialSession.id);
              formData.set("gameId", sessionState.game_id);
              formData.set("text", text);
              formData.set("useOnlineSources", useOnlineSources ? "true" : "false");
              formData.set("image", pendingImageFile);
              return formData;
            })(),
          })
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: initialSession.id, message: text, useOnlineSources }),
          });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message");
      }

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== optimistic.id),
        data.userMessage,
        data.assistantMessage,
      ]);
      if (typeof data.sessionTitle === "string" && data.sessionTitle.trim()) {
        setSessionTitle(data.sessionTitle.trim());
      }
    } catch (chatError) {
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id));
      toast.error(chatError instanceof Error ? chatError.message : "Chat failed");
    } finally {
      if (pendingPreviewUrl && pendingPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
      setIsSending(false);
    }
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
  }

  async function submitFeedback(payload: {
    sentiment: "up" | "down";
    messageId: string;
    reason?: "incorrect_ruling" | "missing_information" | "unclear_explanation" | "other";
    details?: string;
  }, options?: { closeModalOnSuccess?: boolean; showToast?: boolean }) {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: initialSession.id,
          messageId: payload.messageId,
          sentiment: payload.sentiment,
          reason: payload.reason,
          details: payload.details,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit feedback");
      }

      if (options?.showToast ?? true) {
        toast.success("Thanks, this helps us improve.");
      }
      if (options?.closeModalOnSuccess ?? true) {
        setFeedbackOpen(false);
      }
    } catch (feedbackError) {
      toast.error(feedbackError instanceof Error ? feedbackError.message : "Feedback failed");
      throw feedbackError;
    } finally {
      setFeedbackLoading(false);
    }
  }

  function revertPendingFeedback(pending: { messageId: string; previous?: "up" | "down" }) {
    setFeedbackByMessage((prev) => {
      const next = { ...prev };
      if (pending.previous) {
        next[pending.messageId] = pending.previous;
      } else {
        delete next[pending.messageId];
      }
      return next;
    });
  }

  function handleThumbClick(messageId: string, sentiment: "up" | "down") {
    const previous = feedbackByMessage[messageId];
    setFeedbackByMessage((prev) => ({ ...prev, [messageId]: sentiment }));
    setPendingFeedback({ messageId, sentiment, previous, submitted: false });
    setFeedbackOpen(true);
  }

  function handleFeedbackOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFeedbackOpen(true);
      return;
    }

    setFeedbackOpen(false);
    if (!pendingFeedback || pendingFeedback.submitted || feedbackLoading) {
      return;
    }

    const pending = pendingFeedback;
    setPendingFeedback((prev) => (prev ? { ...prev, submitted: true } : prev));
    void submitFeedback(
      { sentiment: pending.sentiment, messageId: pending.messageId },
      { closeModalOnSuccess: false, showToast: true }
    ).catch(() => {
      revertPendingFeedback(pending);
      setPendingFeedback(null);
    });
  }

  async function handleDeleteSession() {
    if (isDeletingSession) return;
    setIsDeletingSession(true);
    try {
      const res = await fetch(`/api/sessions/${initialSession.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete session");
      }
      toast.success("Session deleted");
      router.push("/recent-chats");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    } finally {
      setIsDeletingSession(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-background text-foreground lg:grid lg:h-[calc(100vh-3rem)] lg:grid-cols-[300px_1fr]">
      <aside className="sticky top-0 z-10 border-b border-border bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:static lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between">
          <h1 className="truncate pr-3 text-lg font-semibold">{sessionTitle}</h1>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRulesEditorOpen(true)}
              className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs text-white/80 hover:bg-white/[0.08]"
              title="Using standard rules. You can customize house rules anytime."
            >
              Rules: {rulesModeLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete session"
              className="h-8 w-8 text-white/65 hover:bg-white/10 hover:text-white"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Rules Summary</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/80">
            {summaryBullets.slice(0, 4).map((bullet) => (
              <li key={bullet} className="break-words [overflow-wrap:anywhere]">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex min-h-0 h-full flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {timelineItems.map((item) => {
            if (item.type === "event") {
              return (
                <div key={item.event.id} className="my-2 flex items-center gap-3 text-xs text-white/50">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="shrink-0">{item.event.text}</span>
                  <span className="shrink-0 text-white/35">{new Date(item.event.created_at).toLocaleTimeString()}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              );
            }

            const message = item.message;
            const isAssistant = message.role === "assistant";
            return (
              <Card
                key={message.id}
                className={[
                  "w-fit min-w-0 max-w-full border-border p-3 sm:max-w-3xl",
                  message.role === "user" ? "ml-auto bg-[#2f2818]" : "mr-auto bg-card",
                ].join(" ")}
              >
                {message.image_url ? (
                  <div className="mb-2 overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={message.image_url} alt="User upload" className="max-h-56 w-full object-cover" />
                  </div>
                ) : null}
                <div className="min-w-0 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto">
                  {message.content}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                  {isAssistant ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleThumbClick(message.id, "up")}
                        className={feedbackByMessage[message.id] === "up" ? "bg-[#f2aa4c]/20 text-[#f8c57d] hover:bg-[#f2aa4c]/25" : "text-white/65 hover:bg-white/10"}
                        aria-label="Thumbs up"
                      >
                        <ThumbsUp className={feedbackByMessage[message.id] === "up" ? "size-4 fill-current" : "size-4"} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleThumbClick(message.id, "down")}
                        className={feedbackByMessage[message.id] === "down" ? "bg-[#66d5c8]/20 text-[#66d5c8] hover:bg-[#66d5c8]/25" : "text-white/65 hover:bg-white/10"}
                        aria-label="Thumbs down"
                      >
                        <ThumbsDown className={feedbackByMessage[message.id] === "down" ? "size-4 fill-current" : "size-4"} />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
          {isSending ? <p className="text-sm text-muted-foreground">Assistant is thinking...</p> : null}
        </div>

        <form onSubmit={sendMessage} className="border-t border-border bg-card p-3">
          {attachedImagePreviewUrl ? (
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachedImagePreviewUrl} alt="Selected attachment" className="h-16 w-16 rounded-md object-cover" />
              <div className="max-w-[220px]">
                <p className="truncate text-xs text-white/80">{attachedImageFile?.name ?? "Captured image"}</p>
                <p className="text-xs text-white/55">Attached image</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={clearAttachedImage}
                aria-label="Remove attached image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => uploadInputRef.current?.click()}
              aria-label="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => cameraInputRef.current?.click()}
              aria-label="Capture image"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question..."
              maxLength={2000}
            />
            <Button disabled={isSending || (!input.trim() && !attachedImageFile)} className="bg-[#f2aa4c] text-black hover:bg-[#edb762]">
              Send
            </Button>
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
        </form>
      </main>

      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={handleFeedbackOpenChange}
        sentiment={pendingFeedback?.sentiment ?? "down"}
        loading={feedbackLoading}
        onSubmit={(payload) => {
          if (!pendingFeedback) return;
          const pending = pendingFeedback;
          setPendingFeedback({ ...pending, submitted: true });
          void submitFeedback({
            sentiment: pending.sentiment,
            messageId: pending.messageId,
            reason: payload.reason,
            details: payload.details,
          }).catch(() => {
            revertPendingFeedback(pending);
            setPendingFeedback(null);
          });
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[92vw] max-w-md rounded-2xl border-white/10 bg-[#181a20] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription className="text-white/70">
              This will permanently remove the session and its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteSession} disabled={isDeletingSession}>
              {isDeletingSession ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rulesEditorOpen} onOpenChange={setRulesEditorOpen}>
        <DialogContent className="max-h-[90vh] w-[92vw] max-w-3xl overflow-y-auto rounded-2xl border-white/10 bg-[#181a20]">
          <DialogHeader>
            <DialogTitle>Configure House Rules</DialogTitle>
          </DialogHeader>
          {gameDefinition ? (
            <HouseRulesForm
              game={gameDefinition}
              flow="edit-session"
              sessionId={sessionState.id}
              initialDraft={{
                houseRulesMode: sessionState.house_rules_mode ?? "standard",
                houseRulesJson: sessionState.house_rules_json ?? {},
                houseRulesSummary: sessionState.house_rules_summary ?? "Standard rules",
              }}
              onSavedSession={(updatedSession) => {
                setSessionState(updatedSession);
                setRulesEditorOpen(false);
                const modeLabel = updatedSession.house_rules_mode === "custom" ? "Custom" : "Standard";
                const now = new Date().toISOString();
                setRulesChangedEvents((prev) => [
                  ...prev,
                  {
                    id: `rules-${updatedSession.id}-${Date.now()}`,
                    type: "rules_changed",
                    text: `Rules updated: ${modeLabel}`,
                    created_at: now,
                  },
                ]);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseSummaryBullets(rawSummary: string) {
  const fromLines = rawSummary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
  if (fromLines.length > 1) return fromLines;

  if (rawSummary.includes(";")) {
    return rawSummary
      .split(";")
      .map((item) => item.trim().replace(/\.$/, ""))
      .filter(Boolean);
  }

  return [rawSummary.replace(/^-+\s*/, "").trim()];
}
