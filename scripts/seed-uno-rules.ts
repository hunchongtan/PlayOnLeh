import "dotenv/config";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { buildPublicStorageUrl, getGameRecord, upsertRulesChunks } from "../lib/supabase/dal";
import { getGameDefinition } from "../lib/games/registry";
import { getServerEnv } from "../lib/env/server";

type Chunk = {
  chunk_index: number;
  content: string;
  page_start: number | null;
};

function chunkText(text: string, target = 1000, overlap = 150): Chunk[] {
  const cleaned = text.replace(/\r/g, "").replace(/\t/g, " ").replace(/\n{2,}/g, "\n\n").trim();
  const chunks: Chunk[] = [];

  if (!cleaned) {
    return chunks;
  }

  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + target, cleaned.length);
    let slice = cleaned.slice(start, end);

    if (end < cleaned.length) {
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (lastBreak > target * 0.5) {
        slice = slice.slice(0, lastBreak + 1);
      }
    }

    const content = slice.trim();
    if (content.length >= 80) {
      chunks.push({
        chunk_index: index,
        content,
        page_start: null,
      });
      index += 1;
    }

    if (end >= cleaned.length) {
      break;
    }

    start += Math.max(content.length - overlap, 1);
  }

  return chunks;
}

async function main() {
  const game = getGameDefinition("uno");
  if (!game) {
    throw new Error("Game definition not found for Uno");
  }

  const gameRecord = await getGameRecord("uno");
  if (!gameRecord?.storage_bucket || !gameRecord.rules_pdf_object_path) {
    throw new Error("Missing rules PDF storage config in games table (storage_bucket / rules_pdf_object_path).");
  }

  const publicUrl = buildPublicStorageUrl(gameRecord.storage_bucket, gameRecord.rules_pdf_object_path);
  const res = await fetch(publicUrl);
  if (!res.ok) {
    throw new Error(`Failed to download PDF from Supabase storage: ${res.status} ${res.statusText}`);
  }
  const pdfBuffer = Buffer.from(await res.arrayBuffer());

  const parsed = await pdfParse(pdfBuffer);

  const chunks = chunkText(parsed.text, 1000, 150);
  if (!chunks.length) {
    throw new Error("No chunks produced from Uno PDF.");
  }

  const env = getServerEnv();
  const client = new OpenAI({ apiKey: env.openaiApiKey });

  const embeddings: number[][] = [];
  for (const chunk of chunks) {
    const embedding = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk.content,
    });
    embeddings.push(embedding.data[0].embedding);
  }

  const total = await upsertRulesChunks(
    "uno",
    chunks.map((chunk, idx) => ({
      source_url: game.rulesSourceUrl,
      page_start: chunk.page_start,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding: embeddings[idx],
    }))
  );

  console.log(`Seeded Uno rules chunks: ${total}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
