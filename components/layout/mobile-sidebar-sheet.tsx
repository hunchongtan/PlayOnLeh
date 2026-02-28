"use client";

import { ArrowLeft, Menu } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";

export function MobileSidebarSheet({ onScanGame }: { onScanGame: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const showBack = pathname !== "/";

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#0f1526]/95 px-4 backdrop-blur md:hidden">
        {showBack ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-white hover:bg-white/10"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <Link href="/" aria-label="Go to Home" className="inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2aa4c]">
          <Image src="/logo.png" alt="PlayOnLeh" width={3953} height={2150} className="h-7 w-auto max-w-[150px] object-contain" />
        </Link>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-white hover:bg-white/10"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[300px] border-white/10 bg-[#181a20] p-0 text-white">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar
            onScanGame={onScanGame}
            onNavigate={() => {
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
