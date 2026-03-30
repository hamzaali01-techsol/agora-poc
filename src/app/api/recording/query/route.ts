import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/agora-recording";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resourceId");
    const sid = searchParams.get("sid");
    if (!resourceId || !sid) {
      return NextResponse.json(
        { error: "resourceId and sid are required" },
        { status: 400 },
      );
    }
    const result = await query(resourceId, sid);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
