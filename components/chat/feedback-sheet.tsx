"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Reason = "incorrect_ruling" | "missing_information" | "unclear_explanation" | "other";

export function FeedbackSheet({
  open,
  onOpenChange,
  sentiment,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentiment: "up" | "down";
  onSubmit: (payload: { reason?: Reason; details?: string }) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState<Reason>("incorrect_ruling");
  const [details, setDetails] = useState("");
  const isDown = sentiment === "down";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md rounded-2xl border-white/10 bg-[#181a20] p-6 shadow-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isDown ? "Why was this response unhelpful?" : "Share quick feedback"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isDown ? (
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as Reason)}>
              {[
                ["incorrect_ruling", "Incorrect ruling"],
                ["missing_information", "Missing information"],
                ["unclear_explanation", "Unclear explanation"],
                ["other", "Other"],
              ].map(([value, label]) => (
                <div key={value} className="flex items-center gap-3 py-1">
                  <RadioGroupItem value={value} id={`reason-${value}`} />
                  <Label htmlFor={`reason-${value}`}>{label}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-sm text-white/75">Thanks for the positive feedback. You can add an optional note below.</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="feedback-details">Optional details</Label>
            <Textarea
              id="feedback-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What was wrong or missing?"
              className="min-h-24 resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="h-10" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              className="h-10 w-full sm:w-auto"
              onClick={() => onSubmit({ reason: isDown ? reason : undefined, details: details.trim() || undefined })}
            >
              {loading ? "Submitting..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
