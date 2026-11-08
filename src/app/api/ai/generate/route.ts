import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const text = await generateText(prompt);

    if (!text) {
      return NextResponse.json({ error: "Failed to generate text" }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
