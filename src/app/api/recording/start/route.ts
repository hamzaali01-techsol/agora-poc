import { NextRequest, NextResponse } from "next/server";
import { startComposite /*, startIndividual*/ } from "@/lib/agora-recording";

export async function POST(req: NextRequest) {
  try {
    const { channelName, uid, resourceId, token, mode } = await req.json();
    if (!channelName || !uid || !resourceId) {
      return NextResponse.json(
        { error: "channelName, uid, and resourceId are required" },
        { status: 400 },
      );
    }

    /*
    const result = mode === "individual" 
      ? await startIndividual(channelName, uid, resourceId, token)
      : await startComposite(channelName, uid, resourceId, token);
    */
    const result = await startComposite(channelName, uid, resourceId, token);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
