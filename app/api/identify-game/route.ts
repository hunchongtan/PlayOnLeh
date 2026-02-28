import { NextResponse } from "next/server";
import { identifyGameFromImage } from "@/lib/openai/tasks";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(image.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please use JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    const base64 = bytes.toString("base64");
    const dataUrl = `data:${image.type};base64,${base64}`;

    const result = await identifyGameFromImage({ base64DataUrl: dataUrl });
    const candidates = Array.isArray(result.candidates)
      ? [...result.candidates].sort((a, b) => b.confidence - a.confidence).slice(0, 5)
      : [];
    const best = candidates[0];

    return NextResponse.json({
      ...result,
      candidates,
      best,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
