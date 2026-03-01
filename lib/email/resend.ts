import { getServerEnv } from "@/lib/env/server";

type SendRequestEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendRequestEmail(params: SendRequestEmailParams) {
  const env = getServerEnv();
  if (!env.resendApiKey || !env.fromEmail) {
    return { sent: false as const, reason: "missing-config" as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.fromEmail,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend email failed: ${res.status} ${body}`);
  }

  return { sent: true as const };
}
