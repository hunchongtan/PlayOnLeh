"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScanGameTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={className ?? "h-10 w-full justify-start gap-3 rounded-lg px-3 text-sm text-white/85 hover:bg-white/8"}
    >
      <Camera className="h-4 w-4" />
      <span>Scan Game</span>
    </Button>
  );
}
