"use client";

import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ScanCandidate = {
  gameId: string;
  name: string;
  confidence: number;
};

type ScanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isScanning: boolean;
  error: string | null;
  info: string | null;
  candidates: ScanCandidate[];
  onCameraPick: () => void;
  onUploadPick: () => void;
  onCandidateSelect: (gameId: string) => void;
  onClearResults: () => void;
};

export function ScanModal({
  open,
  onOpenChange,
  isScanning,
  error,
  info,
  candidates,
  onCameraPick,
  onUploadPick,
  onCandidateSelect,
  onClearResults,
}: ScanModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#131b30] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Game</DialogTitle>
          <DialogDescription className="text-white/70">
            Capture a box photo or upload an image to find matching games.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="h-11 bg-[#f2aa4c] text-[#121212] hover:bg-[#f6ba67]"
              onClick={onCameraPick}
              disabled={isScanning}
            >
              <Camera className="mr-2 h-4 w-4" />
              Use camera
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={onUploadPick}
              disabled={isScanning}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload image
            </Button>
          </div>

          {isScanning ? <p className="text-sm text-[#f8c57d]">Scanning...</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {info ? <p className="text-sm text-white/70">{info}</p> : null}

          {candidates.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-medium">Top candidates</p>
              {candidates.map((candidate) => {
                const pct = Math.max(0, Math.min(100, Math.round(candidate.confidence * 100)));
                return (
                  <button
                    key={`${candidate.gameId}-${candidate.name}`}
                    type="button"
                    onClick={() => onCandidateSelect(candidate.gameId)}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-left transition hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{candidate.name}</span>
                      <span className="text-xs text-white/70">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-[#f2aa4c]" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}

              <Button
                type="button"
                variant="ghost"
                className="mt-1 h-11 w-full text-white/80 hover:bg-white/10"
                onClick={onClearResults}
              >
                <X className="mr-2 h-4 w-4" />
                None of these
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
