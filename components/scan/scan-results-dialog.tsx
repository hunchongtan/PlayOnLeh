"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ScanCandidate = {
  gameId: string;
  name: string;
  confidence: number;
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

type GameMeta = {
  id: string;
  name: string;
  coverImageUrl?: string;
};

export type ScanResultsDialogHandle = {
  openCameraPicker: () => void;
  openUploadPicker: () => void;
};

export const ScanResultsDialog = forwardRef<
  ScanResultsDialogHandle,
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmCandidate: (gameId: string) => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    lowConfidenceThreshold?: number;
  }
>(function ScanResultsDialog({
  open,
  onOpenChange,
  onConfirmCandidate,
  onCancel,
  title = "Scan Game",
  description = "Capture a game box photo.",
  lowConfidenceThreshold = 0.5,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCandidate: (gameId: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  lowConfidenceThreshold?: number;
}, ref) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gameMetaById, setGameMetaById] = useState<Record<string, GameMeta>>({});
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  function openCameraPicker() {
    setError(null);
    setInfo(null);
    cameraInputRef.current?.click();
  }

  function openUploadPicker() {
    setError(null);
    setInfo(null);
    uploadInputRef.current?.click();
  }

  useImperativeHandle(ref, () => ({
    openCameraPicker,
    openUploadPicker,
  }));

  const renderedCandidates = useMemo(
    () =>
      candidates.slice(0, 5).map((candidate) => ({
        ...candidate,
        pct: Math.max(0, Math.min(100, Math.round(candidate.confidence * 100))),
      })),
    [candidates]
  );
  const showResultsScreen = !isScanning && renderedCandidates.length > 0;

  useEffect(() => {
    let cancelled = false;
    async function loadGameMeta() {
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error();
        if (cancelled) return;

        const entries: Record<string, GameMeta> = {};
        for (const game of (data.games ?? []) as GameMeta[]) {
          entries[game.id] = game;
        }
        setGameMetaById(entries);
      } catch {
        if (!cancelled) {
          setGameMetaById({});
        }
      }
    }

    void loadGameMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setIsScanning(false);
      setError(null);
      setInfo(null);
      setCandidates([]);
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      return;
    }
  }, [open, previewUrl]);

  async function handleScanFile(file: File) {
    if (!ALLOWED_MIME.has(file.type)) {
      setError("Unsupported image type. Use JPG, PNG, or WEBP.");
      setInfo("If your phone captured HEIC, choose an existing JPG/PNG photo.");
      return;
    }

    setIsScanning(true);
    setError(null);
    setInfo(null);
    setCandidates([]);

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.set("image", file);

    try {
      const response = await fetch("/api/identify-game", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not scan image");
      }

      const list = Array.isArray(data.candidates) ? (data.candidates as ScanCandidate[]) : [];
      const sorted = [...list].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
      setCandidates(sorted);

      if (!sorted.length) {
        setInfo("No likely matches found. Try a clearer photo.");
      } else if (sorted[0].confidence < lowConfidenceThreshold) {
        setInfo("No matches found.");
      } else {
        setInfo("Scan complete. Pick the matching game.");
      }
    } catch (scanError) {
      setCandidates([]);
      setInfo(null);
      setError(scanError instanceof Error ? scanError.message : "Could not scan image");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleScanFile(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleScanFile(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent className="border-white/10 bg-[#131b30] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-white/70">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="relative aspect-video w-full">
                <Image src={previewUrl} alt="Captured game box" fill className="object-cover object-center" />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-center border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={openUploadPicker}
              disabled={isScanning}
            >
              <Upload className="mr-2 h-4 w-4" />
              Use existing photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-center text-white/80 hover:bg-white/10 hover:text-white"
              onClick={openCameraPicker}
              disabled={isScanning}
            >
              <Camera className="mr-2 h-4 w-4" />
              Retake
            </Button>
          </div>

          {isScanning ? <p className="text-sm text-[#f8c57d]">Scanning...</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {info ? <p className="text-sm text-white/70">{info}</p> : null}

          {showResultsScreen ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Top matches</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {renderedCandidates.map((candidate) => {
                  const meta = gameMetaById[candidate.gameId];
                  const imageUrl = meta?.coverImageUrl;
                  return (
                    <button
                      key={`${candidate.gameId}-${candidate.name}`}
                      type="button"
                      onClick={() => onConfirmCandidate(candidate.gameId)}
                      className="group overflow-hidden rounded-xl border border-white/10 bg-[#1a2134] text-left transition hover:-translate-y-0.5 hover:border-[#f2aa4c]/50"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        {imageUrl ? (
                          <Image src={imageUrl} alt={`${candidate.name} cover`} fill className="object-cover object-center" />
                        ) : (
                          <div className="h-full w-full bg-[linear-gradient(160deg,#21273a,#171c2c)]" />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
                          <span className="truncate text-sm font-medium text-white">{candidate.name}</span>
                          <span className="shrink-0 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] text-white/85">
                            {candidate.pct}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
});
