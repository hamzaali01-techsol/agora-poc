"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  LocalUser,
  RemoteUser,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
  useIsConnected,
} from "agora-rtc-react";
import type { ILocalVideoTrack } from "agora-rtc-sdk-ng";
import { AGORA_APP_ID } from "@/lib/agora-config";
import Controls from "./controls";

interface VideoRoomProps {
  channelName: string;
  userName: string;
  onLeave: () => void;
}

export default function VideoRoom({ channelName, userName, onLeave }: VideoRoomProps) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShareTrack, setScreenShareTrack] = useState<ILocalVideoTrack | null>(null);
  const screenShareRef = useRef<HTMLDivElement>(null);

  // Generate a stable UID for this session
  const [uid] = useState(() => Math.floor(Math.random() * 100000) + 1);

  // Agora hooks
  useJoin({ appid: AGORA_APP_ID, channel: channelName, token: null, uid });
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);
  usePublish([localMicrophoneTrack, localCameraTrack]);
  const remoteUsers = useRemoteUsers();
  const isConnected = useIsConnected();

  // Play screen share track in its container
  useEffect(() => {
    if (screenShareTrack && screenShareRef.current) {
      screenShareTrack.play(screenShareRef.current);
    }
    return () => {
      screenShareTrack?.stop();
    };
  }, [screenShareTrack]);

  const handleScreenShareTrack = useCallback((track: ILocalVideoTrack | null) => {
    setScreenShareTrack(track);
  }, []);

  const hasScreenShare = screenShareTrack !== null;
  const totalRemote = remoteUsers.length;

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Agora Meeting</h1>
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
            {channelName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span>{userName}</span>
          {isConnected ? (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              Connecting...
            </span>
          )}
          <span>{totalRemote + 1} participant{totalRemote > 0 ? "s" : ""}</span>
        </div>
      </header>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden p-4">
        {hasScreenShare ? (
          // Screen share layout: big screen + sidebar
          <div className="flex h-full gap-4">
            <div className="flex-1 overflow-hidden rounded-xl bg-gray-900">
              <div ref={screenShareRef} className="h-full w-full" />
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">
                {userName} (Screen)
              </div>
            </div>
            <div className="flex w-56 flex-col gap-3 overflow-y-auto">
              {/* Local user */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-900">
                <LocalUser
                  audioTrack={localMicrophoneTrack}
                  videoTrack={localCameraTrack}
                  cameraOn={cameraOn}
                  micOn={micOn}
                  playAudio={false}
                  className="h-full w-full"
                />
                <div className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs">
                  {userName} (You)
                </div>
              </div>
              {/* Remote users */}
              {remoteUsers.map((user) => (
                <div
                  key={user.uid}
                  className="relative aspect-video overflow-hidden rounded-lg bg-gray-900"
                >
                  <RemoteUser user={user} className="h-full w-full" />
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs">
                    User {user.uid}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Standard grid layout
          <div
            className={`grid h-full gap-4 ${gridClass(totalRemote + 1)}`}
          >
            {/* Local user */}
            <div className="relative overflow-hidden rounded-xl bg-gray-900">
              <LocalUser
                audioTrack={localMicrophoneTrack}
                videoTrack={localCameraTrack}
                cameraOn={cameraOn}
                micOn={micOn}
                playAudio={false}
                className="h-full w-full"
              />
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">
                {userName} (You)
              </div>
              {!micOn && (
                <div className="absolute top-2 right-2 rounded-full bg-red-600 p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  </svg>
                </div>
              )}
            </div>

            {/* Remote users */}
            {remoteUsers.map((user) => (
              <div
                key={user.uid}
                className="relative overflow-hidden rounded-xl bg-gray-900"
              >
                <RemoteUser user={user} className="h-full w-full" />
                <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">
                  User {user.uid}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center pb-6">
        <Controls
          micOn={micOn}
          cameraOn={cameraOn}
          onToggleMic={() => setMicOn((v) => !v)}
          onToggleCamera={() => setCameraOn((v) => !v)}
          onLeave={onLeave}
          channelName={channelName}
          uid={uid}
          onScreenShareTrack={handleScreenShareTrack}
          isScreenSharing={hasScreenShare}
        />
      </div>
    </div>
  );
}

/** Returns Tailwind grid classes based on participant count */
function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  if (count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3";
}
