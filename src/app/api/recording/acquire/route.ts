import { NextRequest, NextResponse } from "next/server";
import { acquire } from "@/lib/agora-recording";

export async function POST(req: NextRequest) {
  try {
    const { channelName, uid } = await req.json();
    if (!channelName || !uid) {
      return NextResponse.json(
        { error: "channelName and uid are required" },
        { status: 400 },
      );
    }
    const result = await acquire(channelName, uid);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
