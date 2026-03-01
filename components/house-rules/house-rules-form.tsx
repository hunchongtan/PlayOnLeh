"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDefaultHouseRules, getHouseRuleSummary, getStandardRulesSummary } from "@/lib/games/registry";
import { GameDefinition } from "@/lib/games/types";
import { HouseRules, SessionRecord } from "@/types/db";
import { toast } from "sonner";

export type HouseRulesDraftState = {
  houseRulesMode: "standard" | "custom";
  houseRulesJson: HouseRules | Record<string, never>;
  houseRulesSummary: string;
};

export function HouseRulesForm({
  game,
  flow = "session",
  sessionId,
  initialDraft,
  onSaveDraft,
  onCancelDraft,
  onSavedSession,
}: {
  game: GameDefinition;
  flow?: "session" | "draft" | "edit-session";
  sessionId?: string;
  initialDraft?: HouseRulesDraftState;
  onSaveDraft?: (draft: HouseRulesDraftState) => void;
  onCancelDraft?: () => void;
  onSavedSession?: (session: SessionRecord) => void;
}) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"standard" | "custom">(initialDraft?.houseRulesMode ?? "standard");
  const [values, setValues] = useState<HouseRules>(
    (initialDraft?.houseRulesJson && Object.keys(initialDraft.houseRulesJson).length
      ? initialDraft.houseRulesJson
      : getDefaultHouseRules(game.id)) as HouseRules
  );
  const [savedSummary, setSavedSummary] = useState(() => {
    if (initialDraft?.houseRulesSummary?.trim()) {
      const parsed = parseSummaryToBullets(initialDraft.houseRulesSummary);
      return {
        summary: initialDraft.houseRulesSummary,
        bullets: parsed.length ? parsed : getStandardRulesSummary(game.id).bullets,
      };
    }
    return getStandardRulesSummary(game.id);
  });
  const [lastSavedJson, setLastSavedJson] = useState<string | null>(
    initialDraft?.houseRulesMode === "custom" && initialDraft.houseRulesJson
      ? JSON.stringify(initialDraft.houseRulesJson)
      : null
  );

  const currentSummary = useMemo(() => {
    if (mode === "standard") {
      return getStandardRulesSummary(game.id);
    }
    return getHouseRuleSummary(game.id, values);
  }, [game.id, mode, values]);
  const hasCustomChanges = mode === "custom" && lastSavedJson !== JSON.stringify(values);
  const canStart = mode === "standard" || !hasCustomChanges;
  const summary = mode === "standard" ? currentSummary : savedSummary;

  function handleModeChange(nextMode: "standard" | "custom") {
    setMode(nextMode);
    if (nextMode === "standard") {
      setSavedSummary(getStandardRulesSummary(game.id));
      setLastSavedJson(null);
    }
  }

  function handleSaveHouseRules() {
    setIsSaving(true);
    const next = getHouseRuleSummary(game.id, values);
    setSavedSummary(next);
    setLastSavedJson(JSON.stringify(values));
    setIsSaving(false);
    toast.success("House rules saved");
  }

  async function handleSubmit() {
    if (!canStart || isSaving || submitLockRef.current || isSubmitting) return;
    const draftState: HouseRulesDraftState = {
      houseRulesMode: mode,
      houseRulesJson: mode === "custom" ? values : {},
      houseRulesSummary: mode === "standard" ? "Standard rules" : summary.summary,
    };

    if (flow === "draft") {
      onSaveDraft?.(draftState);
      return;
    }

    if (flow === "edit-session") {
      if (!sessionId) {
        setError("Missing session id for rule update");
        return;
      }

      setIsSubmitting(true);
      submitLockRef.current = true;
      setError(null);

      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            houseRulesMode: draftState.houseRulesMode,
            houseRules: draftState.houseRulesMode === "custom" ? draftState.houseRulesJson : undefined,
            houseRulesSummary: draftState.houseRulesSummary,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to update rules");
        }

        toast.success("Rules updated");
        onSavedSession?.(data.session as SessionRecord);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to update rules");
      } finally {
        setIsSubmitting(false);
        submitLockRef.current = false;
      }
      return;
    }

    setIsSubmitting(true);
    submitLockRef.current = true;
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          houseRulesMode: draftState.houseRulesMode,
          houseRules: draftState.houseRulesMode === "custom" ? draftState.houseRulesJson : undefined,
          houseRulesSummary: draftState.houseRulesSummary,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create session");
      }

      const data = await res.json();
      toast.success(`Started new ${game.name} session`);
      router.push(`/session/${data.session.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create session");
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold text-foreground">Configure {game.name} house rules</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleModeChange("standard")}
            className={[
              "rounded-xl border px-4 py-3 text-left transition",
              mode === "standard" ? "border-[#f2aa4c] bg-[#f2aa4c]/10 text-white" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
            ].join(" ")}
          >
            <p className="text-sm font-medium">Standard rules (recommended)</p>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("custom")}
            className={[
              "rounded-xl border px-4 py-3 text-left transition",
              mode === "custom" ? "border-[#66d5c8] bg-[#66d5c8]/10 text-white" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
            ].join(" ")}
          >
            <p className="text-sm font-medium">Custom house rules</p>
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rules Summary</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
          {summary.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <div className="rounded-xl border border-border bg-card p-5">
        {mode === "standard" ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Standard rules are selected for this session.
          </div>
        ) : (
          <div className="space-y-5">
            {game.fields.map((field) => {
              if (field.type === "checkbox") {
                const checked = Boolean((values as Record<string, unknown>)[field.key]);
                return (
                  <div key={field.key} className="flex items-start gap-3">
                    <Checkbox
                      id={field.key}
                      checked={checked}
                      onCheckedChange={(next) => setValues((prev) => ({ ...prev, [field.key]: Boolean(next) } as HouseRules))}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                    </div>
                  </div>
                );
              }

              if (field.type === "select") {
                const value = String((values as Record<string, unknown>)[field.key] ?? "");
                return (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Select value={value} onValueChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next } as HouseRules))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (field.type === "number") {
                const current = (values as Record<string, unknown>)[field.key];
                return (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={typeof current === "number" ? String(current) : ""}
                      onChange={(event) =>
                        setValues((prev) => {
                          const raw = event.target.value.trim();
                          const parsed = raw === "" ? null : Number.parseInt(raw, 10);
                          return {
                            ...prev,
                            [field.key]: Number.isNaN(parsed) ? null : parsed,
                          } as HouseRules;
                        })
                      }
                      placeholder="Optional"
                    />
                    {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                  </div>
                );
              }

              return (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Textarea
                    value={String((values as Record<string, unknown>)[field.key] ?? "")}
                    onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value } as HouseRules))}
                    placeholder="Optional custom rules"
                  />
                </div>
              );
            })}
            <Button type="button" onClick={handleSaveHouseRules} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? "Saving..." : "Save house rules"}
            </Button>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {mode === "custom" && hasCustomChanges ? (
          <p className="mt-4 text-xs text-muted-foreground">Save your house rules to continue.</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {flow === "draft" ? (
            <Button type="button" variant="ghost" onClick={onCancelDraft}>
              Cancel
            </Button>
          ) : null}
          <Button onClick={handleSubmit} className={flow === "draft" ? "sm:min-w-40" : "w-full"} disabled={isSubmitting || !canStart || isSaving}>
            {flow === "draft"
              ? isSaving
                ? "Saving..."
                : "Save rules"
              : flow === "edit-session"
                ? isSubmitting
                  ? "Saving..."
                  : "Update rules"
                : isSubmitting
                  ? "Starting Session..."
                  : "Start Session"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function parseSummaryToBullets(rawSummary: string) {
  return rawSummary
    .split("\n")
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}
