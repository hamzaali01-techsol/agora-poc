import { NextRequest, NextResponse } from "next/server";
import { stop } from "@/lib/agora-recording";

export async function POST(req: NextRequest) {
  try {
    const { channelName, uid, resourceId, sid } = await req.json();
    if (!channelName || !uid || !resourceId || !sid) {
      return NextResponse.json(
        { error: "channelName, uid, resourceId, and sid are required" },
        { status: 400 },
      );
    }
    const result = await stop(channelName, uid, resourceId, sid);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
