import { NextResponse } from "next/server";
import { resetAllSessions } from "@/lib/supabase/dal";

export async function POST() {
  try {
    const deleted = await resetAllSessions();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
