import { Suspense } from "react";
import { RequestForm } from "@/components/request/request-form";

export default function RequestPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Request</h1>
      <p className="mt-1 text-sm text-white/65">
          Share a feature idea, request a game, or report a bug.
        </p>
      </div>
      <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-[#181a20] p-6 text-sm text-white/60">Loading request form...</div>}>
        <RequestForm />
      </Suspense>
    </div>
  );
}
