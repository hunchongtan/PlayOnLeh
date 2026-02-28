"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
