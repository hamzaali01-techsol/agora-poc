"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [channelName, setChannelName] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !userId.trim()) return;
    const params = new URLSearchParams({ user: userName || "Guest", uid: userId.trim() });
    router.push(`/room/${encodeURIComponent(channelName.trim())}?${params}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Agora Meeting</h1>
          <p className="mt-2 text-gray-400">
            Video conferencing with screen sharing & recording
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="userName" className="mb-1 block text-sm text-gray-400">
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="userId" className="mb-1 block text-sm text-gray-400">
              User ID <span className="text-red-400">*</span>
            </label>
            <input
              id="userId"
              type="number"
              required
              placeholder="Enter a numeric user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="channelName" className="mb-1 block text-sm text-gray-400">
              Channel Name <span className="text-red-400">*</span>
            </label>
            <input
              id="channelName"
              type="text"
              required
              placeholder="Enter channel name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={!channelName.trim() || !userId.trim()}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join Meeting
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Share the same channel name with others to join the same meeting.
        </p>
      </div>
    </main>
  );
}
