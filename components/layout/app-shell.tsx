"use client";

import { ReactNode, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanModal, ScanCandidate } from "@/components/landing/scan-modal";
import { MobileSidebarSheet } from "@/components/layout/mobile-sidebar-sheet";
import { ScanGameProvider } from "@/components/layout/scan-game-context";
import { Sidebar } from "@/components/layout/sidebar";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [scanOpen, setScanOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const [scanCandidates, setScanCandidates] = useState<ScanCandidate[]>([]);
  const scanSelectHandlerRef = useRef<((gameId: string) => void) | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  async function handleScanFile(file: File) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setScanError("Unsupported image type. Use JPG, PNG, WEBP, or HEIC.");
      return;
    }

    setScanLoading(true);
    setScanError(null);
    setScanInfo(null);
    setScanCandidates([]);

    const formData = new FormData();
    formData.set("image", file);

    try {
      const res = await fetch("/api/identify-game", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not scan image");
      }

      const candidates = (data.candidates ?? []) as ScanCandidate[];
      setScanCandidates(candidates);

      if (!candidates.length) {
        setScanInfo("No likely matches found. Try a clearer photo.");
      } else if ((candidates[0]?.confidence ?? 0) < 0.5) {
        setScanInfo("Low confidence results. Please confirm manually.");
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Could not scan image");
    } finally {
      setScanLoading(false);
    }
  }

  function openScanGame(options?: { onSelectGame?: (gameId: string) => void }) {
    scanSelectHandlerRef.current = options?.onSelectGame ?? null;
    setScanOpen(true);
    setScanError(null);
    setScanInfo(null);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0d1324_0%,#111a31_55%,#0f1528_100%)] text-white md:grid md:grid-cols-[280px_1fr]">
      <aside className="hidden h-screen border-r border-white/10 bg-[#181a20] md:block">
        <Sidebar onScanGame={openScanGame} />
      </aside>

      <ScanGameProvider value={{ openScanGame }}>
        <div className="min-h-screen md:min-h-0 md:h-screen md:overflow-y-auto">
          <MobileSidebarSheet onScanGame={openScanGame} />
          <main className="px-4 py-5 sm:px-6 md:px-6 md:py-6">{children}</main>
        </div>
      </ScanGameProvider>

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

      <ScanModal
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) {
            scanSelectHandlerRef.current = null;
          }
        }}
        isScanning={scanLoading}
        error={scanError}
        info={scanInfo}
        candidates={scanCandidates}
        onCameraPick={() => cameraInputRef.current?.click()}
        onUploadPick={() => uploadInputRef.current?.click()}
        onCandidateSelect={(gameId) => {
          setScanOpen(false);
          const customSelectHandler = scanSelectHandlerRef.current;
          scanSelectHandlerRef.current = null;
          if (customSelectHandler) {
            customSelectHandler(gameId);
            return;
          }
          router.push(`/setup/${gameId}`);
        }}
        onClearResults={() => {
          setScanCandidates([]);
          setScanInfo("You can continue browsing.");
        }}
      />
    </div>
  );
}
