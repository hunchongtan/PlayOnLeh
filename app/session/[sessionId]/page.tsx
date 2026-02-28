import { notFound } from "next/navigation";
import { ChatSessionClient } from "@/components/chat/chat-session-client";
import { getLatestFeedbackByMessage, getMessagesForSession, getSessionById } from "@/lib/supabase/dal";

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);

  if (!session) {
    notFound();
  }

  const messages = await getMessagesForSession(sessionId);
  const initialFeedbackByMessage = await getLatestFeedbackByMessage(sessionId);

  return <ChatSessionClient initialSession={session} initialMessages={messages} initialFeedbackByMessage={initialFeedbackByMessage} />;
}
