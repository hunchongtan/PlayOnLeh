import { getSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { GameId } from "@/lib/games/types";
import { GameRecord, HouseRules, MessageRecord, RagChunk, SessionListItem, SessionRecord } from "@/types/db";

type CreateSessionInput = {
  gameId: GameId;
  houseRulesMode: "standard" | "custom";
  houseRules: HouseRules | Record<string, never>;
  houseRulesSummary: string;
  title?: string;
};

type CreateSessionFallbackInput = {
  gameId: GameId;
  houseRules: HouseRules | Record<string, never>;
  houseRulesSummary: string;
  title?: string;
  modeForResponse: "standard" | "custom";
};

export async function createSession(input: CreateSessionInput): Promise<SessionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      game_id: input.gameId,
      house_rules_mode: input.houseRulesMode,
      house_rules_json: input.houseRules,
      house_rules_summary: input.houseRulesSummary,
      title: input.title ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? "unknown"}`);
  }

  return data as SessionRecord;
}

export async function createSessionWithoutMode(input: CreateSessionFallbackInput): Promise<SessionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      game_id: input.gameId,
      house_rules_json: input.houseRules,
      house_rules_summary: input.houseRulesSummary,
      title: input.title ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session (fallback): ${error?.message ?? "unknown"}`);
  }

  const row = data as Partial<SessionRecord> & Record<string, unknown>;
  return {
    id: String(row.id),
    game_id: row.game_id as GameId,
    house_rules_mode: (row.house_rules_mode as "standard" | "custom" | undefined) ?? input.modeForResponse,
    house_rules_json: (row.house_rules_json as HouseRules | Record<string, never>) ?? {},
    house_rules_summary: String(row.house_rules_summary ?? input.houseRulesSummary),
    title: (row.title as string | null | undefined) ?? null,
    title_source: (row.title_source as "default" | "ai" | "user" | undefined) ?? "default",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getRecentSessions(limit = 10, gameId?: GameId): Promise<SessionListItem[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from("sessions").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (gameId) {
    query = query.eq("game_id", gameId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }

  const sessions = (data ?? []) as SessionRecord[];
  if (!sessions.length) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data: firstUserMessages, error: firstUserMessagesError } = await supabase
    .from("messages")
    .select("session_id, content, created_at")
    .in("session_id", sessionIds)
    .eq("role", "user")
    .order("created_at", { ascending: true });

  if (firstUserMessagesError) {
    throw new Error(`Failed to fetch session preview messages: ${firstUserMessagesError.message}`);
  }

  const firstMessageBySession = new Map<string, string>();
  for (const row of firstUserMessages ?? []) {
    const sessionId = row.session_id as string;
    if (!firstMessageBySession.has(sessionId)) {
      firstMessageBySession.set(sessionId, String(row.content ?? ""));
    }
  }

  const gameIds = [...new Set(sessions.map((session) => session.game_id))];
  const { data: gamesData, error: gamesError } = await supabase
    .from("games")
    .select("id, name, storage_bucket, cover_object_path")
    .in("id", gameIds);

  if (gamesError) {
    throw new Error(`Failed to fetch games for sessions list: ${gamesError.message}`);
  }

  const gameById = new Map<string, { name: string; coverImageUrl: string | null }>();
  for (const game of gamesData ?? []) {
    const bucket = game.storage_bucket as string | null | undefined;
    const coverPath = game.cover_object_path as string | null | undefined;
    gameById.set(String(game.id), {
      name: String(game.name ?? game.id),
      coverImageUrl: bucket && coverPath ? buildPublicStorageUrl(bucket, coverPath) : null,
    });
  }

  return sessions.map((session) => {
    const game = gameById.get(session.game_id);
    return {
      ...session,
      game_name: game?.name,
      cover_image_url: game?.coverImageUrl ?? null,
      first_user_message: firstMessageBySession.get(session.id) ?? null,
    };
  });
}

export async function getSessionById(sessionId: string): Promise<SessionRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  return (data as SessionRecord | null) ?? null;
}

export async function getMostRecentSessionByGame(gameId: GameId): Promise<SessionRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("game_id", gameId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch recent session by game: ${error.message}`);
  }

  return (data as SessionRecord | null) ?? null;
}

export async function getMessagesForSession(sessionId: string): Promise<MessageRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data ?? []) as MessageRecord[];
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sessions").update({ title }).eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to update session title: ${error.message}`);
  }
}

export async function updateSessionTitleIfDefault(sessionId: string, title: string, source: "ai" | "user" = "ai"): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .update({ title, title_source: source })
    .eq("id", sessionId)
    .eq("title_source", "default")
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message || "";
    if (/title_source|schema cache|column/i.test(message)) {
      await updateSessionTitle(sessionId, title);
      return true;
    }
    throw new Error(`Failed to update session title: ${error.message}`);
  }

  return Boolean(data);
}

export async function createMessage(params: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  imageMime?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}): Promise<MessageRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: params.sessionId,
      role: params.role,
      content: params.content,
      image_url: params.imageUrl ?? null,
      image_mime: params.imageMime ?? null,
      model: params.model ?? null,
      prompt_tokens: params.promptTokens ?? null,
      completion_tokens: params.completionTokens ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create message: ${error?.message ?? "unknown"}`);
  }

  await supabase.from("sessions").update({ updated_at: new Date().toISOString() }).eq("id", params.sessionId);

  return data as MessageRecord;
}

export async function createFeedback(params: {
  sessionId: string;
  messageId: string;
  gameId: GameId;
  sentiment: "up" | "down";
  reason?: "incorrect_ruling" | "missing_information" | "unclear_explanation" | "other";
  details?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      session_id: params.sessionId,
      message_id: params.messageId,
      game_id: params.gameId,
      sentiment: params.sentiment,
      reason: params.reason ?? null,
      details: params.details ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create feedback: ${error?.message ?? "unknown"}`);
  }

  return data;
}

export async function getLatestFeedbackByMessage(sessionId: string): Promise<Record<string, "up" | "down">> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("message_id, sentiment, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch feedback state: ${error.message}`);
  }

  const result: Record<string, "up" | "down"> = {};
  for (const row of data ?? []) {
    const messageId = String(row.message_id);
    if (!result[messageId] && (row.sentiment === "up" || row.sentiment === "down")) {
      result[messageId] = row.sentiment;
    }
  }

  return result;
}

export async function resetAllSessions() {
  const supabase = getSupabaseAdminClient();

  const [{ count: feedbackCount, error: feedbackCountError }, { count: messageCount, error: messageCountError }, { count: sessionCount, error: sessionCountError }] =
    await Promise.all([
      supabase.from("feedback").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("sessions").select("id", { count: "exact", head: true }),
    ]);

  if (feedbackCountError || messageCountError || sessionCountError) {
    throw new Error(
      `Failed to count records before reset: ${
        feedbackCountError?.message ?? messageCountError?.message ?? sessionCountError?.message ?? "unknown"
      }`
    );
  }

  const [feedbackDelete, messageDelete, sessionDelete] = await Promise.all([
    supabase.from("feedback").delete().gte("created_at", "1970-01-01T00:00:00.000Z"),
    supabase.from("messages").delete().gte("created_at", "1970-01-01T00:00:00.000Z"),
    supabase.from("sessions").delete().gte("created_at", "1970-01-01T00:00:00.000Z"),
  ]);

  if (feedbackDelete.error || messageDelete.error || sessionDelete.error) {
    throw new Error(
      `Failed to reset sessions: ${
        feedbackDelete.error?.message ?? messageDelete.error?.message ?? sessionDelete.error?.message ?? "unknown"
      }`
    );
  }

  return {
    feedback: feedbackCount ?? 0,
    messages: messageCount ?? 0,
    sessions: sessionCount ?? 0,
  };
}

export async function deleteSessionById(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check session before delete: ${existingError.message}`);
  }
  if (!existing) {
    return false;
  }

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }

  return true;
}

export async function getGames(): Promise<GameRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("games").select("*");

  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  return (data ?? []) as GameRecord[];
}

export async function getGameRecord(gameId: GameId): Promise<GameRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch game record: ${error.message}`);
  }

  return (data as GameRecord | null) ?? null;
}

export function buildPublicStorageUrl(bucket: string, objectPath: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

function extensionFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function uploadChatImage(params: { sessionId: string; file: File; mime: string }) {
  const supabase = getSupabaseAdminClient();
  const bucketName = "chat-images";
  await ensureStorageBucketExists(supabase, bucketName);
  const ext = extensionFromMime(params.mime);
  const objectPath = `sessions/${params.sessionId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage.from(bucketName).upload(objectPath, buffer, {
    contentType: params.mime,
    upsert: false,
  });

  if (error) {
    throw new Error(
      `Failed to upload chat image to '${bucketName}': ${error.message}. Ensure the bucket exists in the same Supabase project configured by NEXT_PUBLIC_SUPABASE_URL.`
    );
  }

  return buildPublicStorageUrl(bucketName, objectPath);
}

async function ensureStorageBucketExists(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  bucketName: string
) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Unable to verify storage buckets: ${error.message}`);
  }

  const exists = (data ?? []).some((bucket) => bucket.name === bucketName);
  if (!exists) {
    console.warn(`[storage] Missing expected bucket '${bucketName}'. Uploads will fail until it is created.`);
    throw new Error(`Bucket not found: '${bucketName}'`);
  }
}

function vectorToPg(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function upsertRulesChunks(
  gameId: GameId,
  chunks: Array<{
    variant_id?: string | null;
    source_url: string;
    source_title?: string | null;
    page_start: number | null;
    chunk_index: number;
    content: string;
    embedding: number[];
  }>
) {
  const supabase = getSupabaseAdminClient();

  const { error: deleteError } = await supabase.from("rules_chunks").delete().eq("game_id", gameId);
  if (deleteError) {
    throw new Error(`Failed to clear existing rules chunks: ${deleteError.message}`);
  }

  const payload = chunks.map((chunk) => ({
    game_id: gameId,
    variant_id: chunk.variant_id ?? null,
    source_url: chunk.source_url,
    source_title: chunk.source_title ?? null,
    page_start: chunk.page_start,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    embedding: vectorToPg(chunk.embedding),
  }));

  const { error } = await supabase
    .from("rules_chunks")
    .insert(payload);

  if (error) {
    throw new Error(`Failed to upsert rules chunks: ${error.message}`);
  }

  return payload.length;
}

export async function searchRulesChunks(gameId: GameId, queryEmbedding: number[], k = 4, variantId: string | null = null): Promise<RagChunk[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("match_rules_chunks", {
    query_embedding: vectorToPg(queryEmbedding),
    match_game_id: gameId,
    match_variant_id: variantId,
    match_count: k,
  });

  if (error) {
    throw new Error(`Failed to search rules chunks: ${error.message}`);
  }

  return ((data ?? []) as Array<RagChunk>).map((chunk) => ({
    id: chunk.id,
    variant_id: chunk.variant_id ?? null,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    page_start: chunk.page_start,
    source_url: chunk.source_url,
    source_title: chunk.source_title ?? null,
  }));
}
