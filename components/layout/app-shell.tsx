"use client";

import { ReactNode, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileSidebarSheet } from "@/components/layout/mobile-sidebar-sheet";
import { ScanGameProvider } from "@/components/layout/scan-game-context";
import { Sidebar } from "@/components/layout/sidebar";
import { ScanResultsDialog } from "@/components/scan/scan-results-dialog";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [scanOpen, setScanOpen] = useState(false);
  const scanSourceRef = useRef<"sidebar" | "input">("sidebar");
  const scanSelectHandlerRef = useRef<((gameId: string) => void) | null>(null);

  function openScanGame(options?: { onSelectGame?: (gameId: string) => void; source?: "sidebar" | "input" }) {
    scanSelectHandlerRef.current = options?.onSelectGame ?? null;
    scanSourceRef.current = options?.source ?? (options?.onSelectGame ? "input" : "sidebar");
    setScanOpen(true);
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
      <ScanResultsDialog
        open={scanOpen}
        onOpenChange={(open) => setScanOpen(open)}
        onCancel={() => {
          scanSelectHandlerRef.current = null;
        }}
        onConfirmCandidate={(gameId) => {
          setScanOpen(false);
          const customSelectHandler = scanSelectHandlerRef.current;
          scanSelectHandlerRef.current = null;
          if (customSelectHandler) {
            customSelectHandler(gameId);
            return;
          }
          if (scanSourceRef.current === "sidebar") {
            router.push(`/games/${gameId}`);
            return;
          }
          router.push(`/games/${gameId}`);
        }}
      />
    </div>
  );
}
