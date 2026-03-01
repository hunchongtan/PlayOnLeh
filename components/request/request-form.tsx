"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Camera, Paperclip, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { validateChatImageFile } from "@/lib/chat/image-attachment";

type RequestType = "feature" | "game" | "bug" | "other";

function inferContext(pathname: string, searchParams: URLSearchParams) {
  const parts = pathname.split("/").filter(Boolean);
  const gameIdFromPath =
    (parts[0] === "games" && parts[1]) || (parts[0] === "setup" && parts[1]) || undefined;
  const sessionIdFromPath = parts[0] === "session" ? parts[1] : undefined;

  const gameId = searchParams.get("gameId") || gameIdFromPath || "";
  const sessionId = searchParams.get("sessionId") || sessionIdFromPath || "";
  return { gameId, sessionId };
}

export function RequestForm() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const initialContext = useMemo(() => inferContext(pathname, searchParams), [pathname, searchParams]);

  const [requestType, setRequestType] = useState<RequestType>("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [includePageUrl, setIncludePageUrl] = useState(true);
  const [includeGameSession, setIncludeGameSession] = useState(false);
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(false);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearAttachment() {
    if (attachedImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
    }
    setAttachedImageFile(null);
    setAttachedImagePreviewUrl(null);
  }

  function resetForm() {
    setRequestType("feature");
    setTitle("");
    setDetails("");
    setIncludePageUrl(true);
    setIncludeGameSession(false);
    setIncludeDeviceInfo(false);
    clearAttachment();
  }

  function applyTypeDefaults(type: RequestType) {
    setRequestType(type);
    if (type === "bug") {
      setIncludePageUrl(true);
      setIncludeGameSession(true);
      setIncludeDeviceInfo(true);
      return;
    }
    setIncludePageUrl(true);
    setIncludeGameSession(false);
    setIncludeDeviceInfo(false);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!details.trim()) {
      toast.error("Please enter details before sending.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("type", requestType);
      formData.set("title", title.trim());
      formData.set("details", details.trim());
      formData.set("include_page_url", includePageUrl ? "true" : "false");
      formData.set("include_game_session", includeGameSession ? "true" : "false");
      formData.set("include_device_info", includeDeviceInfo ? "true" : "false");

      if (includePageUrl) {
        formData.set("page_url", window.location.href);
      }
      if (includeGameSession && initialContext.gameId) {
        formData.set("game_id", initialContext.gameId);
      }
      if (includeGameSession && initialContext.sessionId) {
        formData.set("session_id", initialContext.sessionId);
      }
      if (includeDeviceInfo) {
        formData.set("user_agent", navigator.userAgent);
      }
      if (attachedImageFile) {
        formData.set("screenshot", attachedImageFile);
      }

      const res = await fetch("/api/request", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send request");
      }

      if (data.warning) {
        toast.success("Saved, but email not configured.");
      } else {
        toast.success("Sent — thanks!");
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-[#181a20] p-5 sm:p-6">
      <div className="space-y-3">
        <Label className="text-sm text-white/80">Type</Label>
        <RadioGroup value={requestType} onValueChange={(value) => applyTypeDefaults(value as RequestType)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: "feature", label: "Feature" },
            { value: "game", label: "Game" },
            { value: "bug", label: "Bug" },
            { value: "other", label: "Other" },
          ].map((item) => (
            <Label
              key={item.value}
              htmlFor={`request-type-${item.value}`}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.03] text-sm text-white/85 has-[input:checked]:border-[#f2aa4c] has-[input:checked]:bg-[#f2aa4c]/15 has-[input:checked]:text-[#f8c57d]"
            >
              <RadioGroupItem id={`request-type-${item.value}`} value={item.value} className="sr-only" />
              {item.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="request-title">Title (optional)</Label>
        <Input
          id="request-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Short summary"
          className="border-white/15 bg-white/[0.03]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="request-details">Details</Label>
        <Textarea
          id="request-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          required
          rows={6}
          placeholder="Describe your feature request, game request, or bug report."
          className="border-white/15 bg-white/[0.03]"
        />
      </div>

      <div className="space-y-2">
        <Label>Attach screenshot (optional)</Label>
        {attachedImagePreviewUrl ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachedImagePreviewUrl} alt="Attached screenshot" className="h-14 w-14 rounded-md object-cover" />
            <div className="max-w-[220px]">
              <p className="truncate text-xs text-white/80">{attachedImageFile?.name ?? "Screenshot"}</p>
              <p className="text-xs text-white/55">Attached image</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={clearAttachment} aria-label="Remove screenshot">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="border-white/20 bg-white/[0.03]" onClick={() => uploadInputRef.current?.click()}>
              <Paperclip className="mr-2 h-4 w-4" />
              Upload image
            </Button>
            <Button type="button" variant="outline" className="border-white/20 bg-white/[0.03]" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" />
              Use camera
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Include context</Label>
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <Checkbox checked={includePageUrl} onCheckedChange={(value) => setIncludePageUrl(Boolean(value))} />
            current URL/route
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <Checkbox checked={includeGameSession} onCheckedChange={(value) => setIncludeGameSession(Boolean(value))} />
            selected gameId/sessionId if available
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <Checkbox checked={includeDeviceInfo} onCheckedChange={(value) => setIncludeDeviceInfo(Boolean(value))} />
            device/browser info
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="min-w-28 bg-[#f2aa4c] text-[#111] hover:bg-[#f6ba67]">
          {submitting ? "Sending..." : "Send"}
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
  );
}
