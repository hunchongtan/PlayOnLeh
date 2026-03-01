import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  countRecentRequestsByIpHash,
  createRequest,
  createSignedRequestScreenshotUrl,
  updateRequestAiFields,
  uploadRequestScreenshot,
} from "@/lib/supabase/dal";
import { summarizeRequestForTriage } from "@/lib/openai/tasks";
import { sendRequestEmail } from "@/lib/email/resend";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const RATE_LIMIT_COUNT = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const requestSchema = z.object({
  type: z.enum(["feature", "game", "bug", "other"]),
  title: z.string().trim().max(200).optional(),
  details: z.string().trim().min(1).max(8000),
  page_url: z.string().trim().max(2000).optional(),
  game_id: z.string().trim().max(100).optional(),
  session_id: z.string().uuid().optional(),
  user_agent: z.string().trim().max(2000).optional(),
  include_page_url: z.boolean().optional(),
  include_game_session: z.boolean().optional(),
  include_device_info: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const parsed = requestSchema.safeParse({
      type: toString(form.get("type")),
      title: toString(form.get("title")),
      details: toString(form.get("details")),
      page_url: toString(form.get("page_url")),
      game_id: toString(form.get("game_id")),
      session_id: toString(form.get("session_id")),
      user_agent: toString(form.get("user_agent")),
      include_page_url: toBool(form.get("include_page_url")),
      include_game_session: toBool(form.get("include_game_session")),
      include_device_info: toBool(form.get("include_device_info")),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHash = createHash("sha256").update(ip).digest("hex");
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const recentCount = await countRecentRequestsByIpHash(ipHash, since);
    if (recentCount >= RATE_LIMIT_COUNT) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    const data = parsed.data;
    const includePage = data.include_page_url ?? false;
    const includeGameSession = data.include_game_session ?? false;
    const includeDevice = data.include_device_info ?? false;

    const screenshot = form.get("screenshot");
    let screenshotPath: string | null = null;
    if (screenshot instanceof File && screenshot.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(screenshot.type)) {
        return NextResponse.json({ error: "Unsupported screenshot type. Use JPG, PNG, or WEBP." }, { status: 400 });
      }
      if (screenshot.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Screenshot is too large. Max size is 8MB." }, { status: 400 });
      }
      screenshotPath = await uploadRequestScreenshot({ file: screenshot, mime: screenshot.type });
    }

    const requestRecord = await createRequest({
      type: data.type,
      title: data.title?.trim() || null,
      details: data.details,
      pageUrl: includePage ? data.page_url?.trim() || null : null,
      gameId: includeGameSession ? data.game_id?.trim() || null : null,
      sessionId: includeGameSession ? data.session_id ?? null : null,
      userAgent: includeDevice ? data.user_agent?.trim() || null : null,
      screenshotUrl: screenshotPath,
      ipHash,
    });

    const warnings: string[] = [];
    let aiSubject: string | null = null;
    let aiSummary: string | null = null;
    let aiTags: string[] | null = null;

    try {
      const ai = await summarizeRequestForTriage({
        type: requestRecord.type,
        title: requestRecord.title ?? undefined,
        details: requestRecord.details,
        pageUrl: requestRecord.page_url ?? undefined,
        gameId: requestRecord.game_id ?? undefined,
        sessionId: requestRecord.session_id ?? undefined,
        userAgent: requestRecord.user_agent ?? undefined,
      });
      aiSubject = ai.subject;
      aiSummary = ai.summaryBullets.join("\n");
      aiTags = ai.tags;
      await updateRequestAiFields(requestRecord.id, {
        aiSubject,
        aiSummary,
        aiTags,
      });
    } catch {
      warnings.push("Saved, but AI summary failed.");
    }

    let screenshotSignedUrl: string | null = null;
    if (requestRecord.screenshot_url) {
      try {
        screenshotSignedUrl = await createSignedRequestScreenshotUrl(requestRecord.screenshot_url, 60 * 60 * 24 * 7);
      } catch {
        warnings.push("Saved, but screenshot link could not be generated.");
      }
    }

    try {
      const emailSubject = aiSubject || requestRecord.title || `New ${requestRecord.type} request`;
      const summaryBullets =
        aiSummary?.split("\n").map((line) => line.trim()).filter(Boolean) ??
        ["Details received and saved for review.", "Needs manual triage."];

      const sendResult = await sendRequestEmail({
        to: "tanhunchong01@gmail.com",
        subject: `[PlayOnLeh Request] ${emailSubject}`,
        text: buildRequestEmailText({
          request: requestRecord,
          aiSubject,
          summaryBullets,
          aiTags,
          screenshotSignedUrl,
        }),
        html: buildRequestEmailHtml({
          request: requestRecord,
          aiSubject,
          summaryBullets,
          aiTags,
          screenshotSignedUrl,
        }),
      });

      if (!sendResult.sent) {
        warnings.push("Saved, but email not configured.");
      }
    } catch {
      warnings.push("Saved, but email delivery failed.");
    }

    return NextResponse.json({
      ok: true,
      requestId: requestRecord.id,
      emailSent: !warnings.includes("Saved, but email not configured.") && !warnings.includes("Saved, but email delivery failed."),
      warning: warnings.length ? warnings.join(" ") : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function toString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

function toBool(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  return value === "true";
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

function buildRequestEmailText(params: {
  request: Awaited<ReturnType<typeof createRequest>>;
  aiSubject: string | null;
  summaryBullets: string[];
  aiTags: string[] | null;
  screenshotSignedUrl: string | null;
}) {
  const lines = [
    `Type: ${params.request.type}`,
    `Title: ${params.request.title ?? "(none)"}`,
    `Created at: ${params.request.created_at}`,
    "",
    `AI Subject: ${params.aiSubject ?? "(not available)"}`,
    "AI Summary:",
    ...params.summaryBullets.map((bullet) => `- ${bullet}`),
    params.aiTags?.length ? `Tags: ${params.aiTags.join(", ")}` : "Tags: (none)",
    "",
    "Original details:",
    params.request.details,
    "",
    "Context:",
    `URL: ${params.request.page_url ?? "(none)"}`,
    `Game ID: ${params.request.game_id ?? "(none)"}`,
    `Session ID: ${params.request.session_id ?? "(none)"}`,
    `User Agent: ${params.request.user_agent ?? "(none)"}`,
    `Screenshot: ${params.screenshotSignedUrl ?? "(none)"}`,
  ];
  return lines.join("\n");
}

function buildRequestEmailHtml(params: {
  request: Awaited<ReturnType<typeof createRequest>>;
  aiSubject: string | null;
  summaryBullets: string[];
  aiTags: string[] | null;
  screenshotSignedUrl: string | null;
}) {
  const bullets = params.summaryBullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>New PlayOnLeh Request</h2>
      <p><strong>Type:</strong> ${escapeHtml(params.request.type)}</p>
      <p><strong>Title:</strong> ${escapeHtml(params.request.title ?? "(none)")}</p>
      <p><strong>Created at:</strong> ${escapeHtml(params.request.created_at)}</p>
      <hr />
      <p><strong>AI Subject:</strong> ${escapeHtml(params.aiSubject ?? "(not available)")}</p>
      <p><strong>AI Summary:</strong></p>
      <ul>${bullets}</ul>
      <p><strong>Tags:</strong> ${escapeHtml(params.aiTags?.join(", ") ?? "(none)")}</p>
      <hr />
      <p><strong>Original details:</strong></p>
      <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">${escapeHtml(params.request.details)}</pre>
      <p><strong>Context</strong></p>
      <ul>
        <li><strong>URL:</strong> ${escapeHtml(params.request.page_url ?? "(none)")}</li>
        <li><strong>Game ID:</strong> ${escapeHtml(params.request.game_id ?? "(none)")}</li>
        <li><strong>Session ID:</strong> ${escapeHtml(params.request.session_id ?? "(none)")}</li>
        <li><strong>User Agent:</strong> ${escapeHtml(params.request.user_agent ?? "(none)")}</li>
        <li><strong>Screenshot:</strong> ${params.screenshotSignedUrl ? `<a href="${params.screenshotSignedUrl}">Open screenshot</a>` : "(none)"}</li>
      </ul>
    </div>
  `;
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
