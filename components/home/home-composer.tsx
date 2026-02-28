"use client";

import { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, Camera, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function HomeComposer({
  value,
  onChange,
  onSubmit,
  inputRef,
  sendDisabled,
  isSending,
  attachedImageFile,
  attachedImagePreviewUrl,
  onPickUpload,
  onPickCamera,
  onClearAttachment,
  showGameHint,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  sendDisabled: boolean;
  isSending: boolean;
  attachedImageFile: File | null;
  attachedImagePreviewUrl: string | null;
  onPickUpload: () => void;
  onPickCamera: () => void;
  onClearAttachment: () => void;
  showGameHint: boolean;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSending) return;
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isSending) return;
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/12 bg-[#181a20]/95 p-3 shadow-[0_22px_50px_rgba(0,0,0,0.35)] sm:p-4"
    >
      {attachedImagePreviewUrl ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachedImagePreviewUrl} alt="Selected attachment" className="h-14 w-14 rounded-md object-cover" />
          <div className="max-w-[220px]">
            <p className="truncate text-xs text-white/80">{attachedImageFile?.name ?? "Captured image"}</p>
            <p className="text-xs text-white/55">Attached image</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onClearAttachment}
            aria-label="Remove attached image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder="Ask a question"
        className="min-h-[84px] resize-none border-0 bg-[#181a20]/95 px-1 py-1 text-base text-white placeholder:text-white/45 focus-visible:ring-0 dark:bg-[#181a20]/95"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={onPickUpload}
            aria-label="Attach image"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={onPickCamera}
            aria-label="Capture image"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={sendDisabled || isSending}
          className="h-11 w-11 rounded-full bg-[#f2aa4c] text-[#101010] transition hover:bg-[#f6ba67] disabled:bg-white/20 disabled:text-white/45"
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
      {showGameHint ? <p className="mt-2 text-xs text-white/55">Pick a game to enable sending.</p> : null}
    </form>
  );
}
