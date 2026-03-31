"use client";

import { use, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import VideoRoom from "@/components/video-room";

export default function RoomPage({
  params,
}: {
  params: Promise<{ channelName: string }>;
}) {
  const { channelName } = use(params);
  const searchParams = useSearchParams();
  const userName = searchParams.get("user") || "Guest";
  const uid = parseInt(searchParams.get("uid") || "0", 10) || Math.floor(Math.random() * 100000) + 1;
  const router = useRouter();
  const [left, setLeft] = useState(false);

  const client = useMemo(
    () => AgoraRTC.createClient({ mode: "rtc", codec: "h264" }),
    [],
  );

  if (left) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-semibold">You left the meeting</h2>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-500"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <AgoraRTCProvider client={client}>
      <VideoRoom
        channelName={decodeURIComponent(channelName)}
        userName={userName}
        uid={uid}
        onLeave={() => setLeft(true)}
      />
    </AgoraRTCProvider>
  );
}
