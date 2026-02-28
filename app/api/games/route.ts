import { NextResponse } from "next/server";
import { buildPublicStorageUrl, getGames } from "@/lib/supabase/dal";

export async function GET() {
  try {
    const records = await getGames();

    const games = records.map((record) => {
      const bucket = record.storage_bucket || "";
      const coverPath = record.cover_object_path || "";

      const coverImageUrl = bucket && coverPath ? buildPublicStorageUrl(bucket, coverPath) : "/logo.png";

      return {
        id: record.id,
        name: record.name,
        description: record.description,
        category: record.id === "mahjong" ? "Tile Game" : "Card Game",
        coverImageUrl,
      };
    });

    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
