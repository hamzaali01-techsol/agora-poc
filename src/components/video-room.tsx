"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  LocalUser,
  RemoteUser,
  useJoin,
  useRemoteUsers,
  useIsConnected,
  useRTCClient,
} from "agora-rtc-react";
import AgoraRTC from "agora-rtc-react";
import type { ICameraVideoTrack, IMicrophoneAudioTrack, ILocalVideoTrack } from "agora-rtc-react";
import { AGORA_APP_ID } from "@/lib/agora-config";
import Controls from "./controls";

interface VideoRoomProps {
  channelName: string;
  userName: string;
  uid: number;
  onLeave: () => void;
}

export default function VideoRoom({ channelName, userName, uid, onLeave }: VideoRoomProps) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);
  const [screenUid, setScreenUid] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Fetch token from server before joining
  useEffect(() => {
    fetch(`/api/token?channel=${encodeURIComponent(channelName)}&uid=${uid}`)
      .then((res) => res.json())
      .then((data) => setToken(data.token))
      .catch((err) => console.error("Failed to fetch token:", err));
  }, [channelName, uid]);

  // Agora hooks — only join once we have a token
  useJoin(
    token
      ? { appid: AGORA_APP_ID, channel: channelName, token, uid }
      : { appid: AGORA_APP_ID, channel: channelName, token: null, uid },
    token !== null,
  );
  const client = useRTCClient();
  const remoteUsers = useRemoteUsers();
  const isConnected = useIsConnected();

  // Manually manage mic track: close() to release hardware, create new to re-enable
  const [localMicrophoneTrack, setLocalMicrophoneTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const micBusyRef = useRef(false);

  useEffect(() => {
    if (micBusyRef.current || !isConnected) return;
    let cancelled = false;

    async function toggle() {
      micBusyRef.current = true;
      try {
        if (micOn) {
          const track = await AgoraRTC.createMicrophoneAudioTrack();
          if (cancelled) { track.close(); return; }
          micTrackRef.current = track;
          setLocalMicrophoneTrack(track);
          await client.publish(track);
        } else {
          const track = micTrackRef.current;
          if (track) {
            await client.unpublish(track);
            track.close();
            micTrackRef.current = null;
            if (!cancelled) setLocalMicrophoneTrack(null);
          }
        }
      } catch (err) {
        console.error("Mic toggle error:", err);
      } finally {
        micBusyRef.current = false;
      }
    }

    toggle();
    return () => { cancelled = true; };
  }, [micOn, client, isConnected]);

  // Manually manage camera track: close() to release hardware, create new to re-enable
  const [localCameraTrack, setLocalCameraTrack] = useState<ICameraVideoTrack | null>(null);
  const cameraTrackRef = useRef<ICameraVideoTrack | null>(null);
  const cameraBusyRef = useRef(false);

  useEffect(() => {
    if (cameraBusyRef.current || !isConnected) return;
    let cancelled = false;

    async function toggle() {
      cameraBusyRef.current = true;
      try {
        if (cameraOn) {
          const track = await AgoraRTC.createCameraVideoTrack();
          if (cancelled) { track.close(); return; }
          cameraTrackRef.current = track;
          setLocalCameraTrack(track);
          await client.publish(track);
        } else {
          const track = cameraTrackRef.current;
          if (track) {
            await client.unpublish(track);
            track.close();
            cameraTrackRef.current = null;
            if (!cancelled) setLocalCameraTrack(null);
          }
        }
      } catch (err) {
        console.error("Camera toggle error:", err);
      } finally {
        cameraBusyRef.current = false;
      }
    }

    toggle();
    return () => { cancelled = true; };
  }, [cameraOn, client, isConnected]);

  // Play local screen share track into its DOM element
  useEffect(() => {
    if (screenTrack) {
      const el = document.getElementById("local-screen");
      if (el) screenTrack.play(el);
    }
    return () => { screenTrack?.stop(); };
  }, [screenTrack]);

  const handleScreenShare = useCallback(
    (track: ILocalVideoTrack | null, sUid: number | null) => {
      setScreenTrack(track);
      setScreenUid(sUid);
    },
    [],
  );

  const handleLeave = useCallback(() => {
    micTrackRef.current?.close();
    micTrackRef.current = null;
    cameraTrackRef.current?.close();
    cameraTrackRef.current = null;
    screenTrack?.close();
    onLeave();
  }, [screenTrack, onLeave]);

  // Filter out our own screen-share UID from remote users
  const filteredRemotes = remoteUsers.filter((u) => u.uid !== screenUid);
  const isScreenSharing = screenTrack !== null;
  const totalParticipants = filteredRemotes.length + 1 + (isScreenSharing ? 1 : 0);

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
          ) : token === null ? (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              Fetching token...
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              Connecting...
            </span>
          )}
          <span>
            {totalParticipants} tile{totalParticipants !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div className={`grid h-full gap-4 ${gridClass(totalParticipants)}`}>
          {/* Local camera */}
          <div className="relative min-h-0 overflow-hidden rounded-xl bg-gray-900 [&_video]:!object-contain">
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

          {/* Local screen share tile (dual-client — shown as separate tile) */}
          {isScreenSharing && (
            <div className="relative min-h-0 overflow-hidden rounded-xl bg-gray-900 [&_video]:!object-contain">
              <div id="local-screen" className="h-full w-full" />
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">
                {userName} (Screen)
              </div>
            </div>
          )}

          {/* Remote users (excluding our own screen-share UID) */}
          {filteredRemotes.map((user) => {
            const isRemoteScreen = Number(user.uid) > 1_000_000;
            return (
              <div
                key={user.uid}
                className="relative min-h-0 overflow-hidden rounded-xl bg-gray-900 [&_video]:!object-contain"
              >
                <RemoteUser user={user} className="h-full w-full" />
                <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">
                  {isRemoteScreen
                    ? `User ${Number(user.uid) - 1_000_000} (Screen)`
                    : `User ${user.uid}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center pb-6">
        <Controls
          micOn={micOn}
          cameraOn={cameraOn}
          onToggleMic={() => setMicOn((v) => !v)}
          onToggleCamera={() => setCameraOn((v) => !v)}
          onLeave={handleLeave}
          channelName={channelName}
          uid={uid}
          onScreenShare={handleScreenShare}
          isScreenSharing={isScreenSharing}
        />
      </div>
    </div>
  );
}

/** Returns Tailwind grid classes based on tile count */
function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  if (count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3";
}
