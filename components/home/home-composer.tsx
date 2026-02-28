"use client";

import { FormEvent, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function HomeComposer({
  value,
  onChange,
  onSubmit,
  inputRef,
  sendDisabled,
  isSending,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  sendDisabled: boolean;
  isSending: boolean;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/12 bg-[#181a20]/95 p-3 shadow-[0_22px_50px_rgba(0,0,0,0.35)] sm:p-4"
    >
      <Textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder="Ask a question"
        className="min-h-[84px] resize-none border-0 bg-transparent px-1 py-1 text-base text-white placeholder:text-white/45 focus-visible:ring-0"
      />
      <div className="mt-2 flex items-center justify-end">
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
    </form>
  );
}
