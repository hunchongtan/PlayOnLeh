"use client";

import { createContext, useContext } from "react";

type ScanGameContextValue = {
  openScanGame: (options?: { onSelectGame?: (gameId: string) => void; source?: "sidebar" | "input" }) => void;
};

const ScanGameContext = createContext<ScanGameContextValue | null>(null);

export function ScanGameProvider({
  value,
  children,
}: {
  value: ScanGameContextValue;
  children: React.ReactNode;
}) {
  return <ScanGameContext.Provider value={value}>{children}</ScanGameContext.Provider>;
}

export function useScanGame() {
  return useContext(ScanGameContext);
}
