"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { BookOpen, Clock3, MessageSquareDiff, PlusSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScanGameTrigger } from "@/components/layout/scan-game-trigger";

type SidebarProps = {
  onScanGame: () => void;
  onNavigate?: () => void;
};

type LinkItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  section: "PLAY" | "LIBRARY" | "SETTINGS";
  match: (pathname: string) => boolean;
};

const linkItems: LinkItem[] = [
  {
    label: "New Session",
    href: "/sessions/new",
    icon: PlusSquare,
    section: "PLAY",
    match: (pathname) => pathname === "/sessions/new" || pathname.startsWith("/setup/"),
  },
  {
    label: "Games Catalogue",
    href: "/games",
    icon: BookOpen,
    section: "LIBRARY",
    match: (pathname) => pathname === "/games",
  },
  {
    label: "Recent Chats",
    href: "/recent-chats",
    icon: Clock3,
    section: "LIBRARY",
    match: (pathname) => pathname === "/recent-chats" || pathname.startsWith("/session/"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "SETTINGS",
    match: (pathname) => pathname === "/settings",
  },
  {
    label: "Request",
    href: "/request",
    icon: MessageSquareDiff,
    section: "SETTINGS",
    match: (pathname) => pathname === "/request",
  },
];

export function Sidebar({ onScanGame, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  function renderSection(section: LinkItem["section"]) {
    const items = linkItems.filter((item) => item.section === section);

    return (
      <div className="space-y-1.5">
        <p className="px-3 text-xs font-semibold tracking-[0.08em] text-white/45">{section}</p>
        {section === "PLAY" ? (
          <>
            {items.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition",
                    active ? "bg-[#f2aa4c]/15 text-[#f8c57d]" : "text-white/85 hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <ScanGameTrigger
              onClick={() => {
                onScanGame();
                onNavigate?.();
              }}
              className="h-10 w-full justify-start gap-3 rounded-lg px-3 text-sm text-white/85 hover:bg-white/10"
            />
          </>
        ) : (
          items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition",
                  active ? "bg-[#f2aa4c]/15 text-[#f8c57d]" : "text-white/85 hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <Link href="/" onClick={onNavigate} className="block w-full">
          <Image
            src="/logo.png"
            alt="PlayOnLeh"
            width={3953}
            height={2150}
            priority
            className="h-10 w-auto max-w-full object-contain"
          />
        </Link>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {renderSection("PLAY")}
        {renderSection("LIBRARY")}
        {renderSection("SETTINGS")}
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f2aa4c] text-xs font-semibold text-[#121212]">G</div>
          <div>
            <p className="text-sm font-medium text-white">Guest</p>
          </div>
        </div>
      </div>
    </div>
  );
}
