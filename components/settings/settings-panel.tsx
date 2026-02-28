"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readOnlineSourcesPreference, writeOnlineSourcesPreference } from "@/lib/client/preferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useOnlineSources, setUseOnlineSources] = useState(false);

  useEffect(() => {
    setUseOnlineSources(readOnlineSourcesPreference());
  }, []);

  function toggleOnlineSources() {
    setUseOnlineSources((prev) => {
      const next = !prev;
      writeOnlineSourcesPreference(next);
      toast.success(next ? "Online-source fallback enabled" : "Online-source fallback disabled");
      return next;
    });
  }

  async function resetSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to reset sessions");
      }
      toast.success(`Deleted ${data.deleted.sessions} sessions, ${data.deleted.messages} messages, ${data.deleted.feedback} feedback records.`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset sessions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/65">Guest mode only. No account settings yet.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Use online sources when rulebook doesn&apos;t cover it (beta)</p>
            <p className="mt-1 text-sm text-white/65">Rulebook stays as primary source of truth. Web search is only used as fallback.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useOnlineSources}
            onClick={toggleOnlineSources}
            className={[
              "relative h-7 w-12 rounded-full border transition",
              useOnlineSources ? "border-[#f2aa4c] bg-[#f2aa4c]/40" : "border-white/20 bg-white/10",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
                useOnlineSources ? "left-6" : "left-0.5",
              ].join(" ")}
            />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-300" />
          <div>
            <p className="text-sm font-semibold text-red-100">Danger Zone</p>
            <p className="mt-1 text-sm text-red-100/80">
              Reset sessions will delete all sessions, messages, and feedback in this app database.
            </p>
            <Button className="mt-4 bg-red-500 text-white hover:bg-red-600" onClick={() => setOpen(true)}>
              Reset sessions
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#181a20] text-white">
          <DialogHeader>
            <DialogTitle>Reset sessions?</DialogTitle>
            <DialogDescription className="text-white/70">
              This will permanently delete all sessions, messages, and feedback (global reset, no user isolation in v1).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button className="bg-red-500 text-white hover:bg-red-600" disabled={loading} onClick={() => void resetSessions()}>
              {loading ? "Resetting..." : "Confirm reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
