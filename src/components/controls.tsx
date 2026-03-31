"use client";

import { useState, useCallback, useRef } from "react";
import AgoraRTC from "agora-rtc-react";
import type { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack } from "agora-rtc-react";
import { AGORA_APP_ID } from "@/lib/agora-config";
import {
  acquireRecording,
  startRecording,
  stopRecording,
  type RecordingState,
} from "@/lib/recording-api";

// ─── Icons ────────────────────────────────────────────────────────

function MicIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function RecordIcon({ recording }: { recording: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={recording ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      {recording ? (
        <rect x="8" y="8" width="8" height="8" rx="1" fill="white" stroke="none" />
      ) : (
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      )}
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

// ─── Controls Component ───────────────────────────────────────────

interface ControlsProps {
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
  channelName: string;
  uid: number;
  onScreenShare: (track: ILocalVideoTrack | null, screenUid: number | null) => void;
  isScreenSharing: boolean;
}

export default function Controls({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
  channelName,
  uid,
  onScreenShare,
  isScreenSharing,
}: ControlsProps) {
  const storageKey = `agora-recording:${channelName}`;
  const [recording, setRecording] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) !== null;
  });
  const [recordingLoading, setRecordingLoading] = useState(false);

  // Dual-client screen share refs
  const screenClientRef = useRef<IAgoraRTCClient | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const screenAudioRef = useRef<ILocalAudioTrack | null>(null);

  // ── Screen sharing (dual-client approach) ──

  const stopScreen = useCallback(async () => {
    screenTrackRef.current?.close();
    screenAudioRef.current?.close();
    screenTrackRef.current = null;
    screenAudioRef.current = null;
    try { await screenClientRef.current?.leave(); } catch { /* ignore */ }
    screenClientRef.current = null;
    onScreenShare(null, null);
  }, [onScreenShare]);

  const startScreen = useCallback(async () => {
    try {
      // 1. Create screen track (with optional system audio)
      const screenResult = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1" },
        "auto",
      );

      let screenVideoTrack: ILocalVideoTrack;
      let screenAudioTrack: ILocalAudioTrack | null = null;
      if (Array.isArray(screenResult)) {
        screenVideoTrack = screenResult[0] as unknown as ILocalVideoTrack;
        screenAudioTrack = screenResult[1] as unknown as ILocalAudioTrack;
      } else {
        screenVideoTrack = screenResult as unknown as ILocalVideoTrack;
      }

      // 2. Screen UID = main UID + 1,000,000 (convention from reference)
      const screenUid = uid + 1_000_000;

      // 3. Fetch token for screen UID
      const res = await fetch(
        `/api/token?channel=${encodeURIComponent(channelName)}&uid=${screenUid}`,
      );
      const { token } = await res.json();

      // 4. Create & join a separate client for screen sharing
      const screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (screenClient as any).join(AGORA_APP_ID, channelName, token, screenUid);

      // 5. Publish screen track(s)
      const tracksToPublish = [screenVideoTrack];
      if (screenAudioTrack) tracksToPublish.push(screenAudioTrack as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (screenClient as any).publish(tracksToPublish);

      screenClientRef.current = screenClient as unknown as IAgoraRTCClient;
      screenTrackRef.current = screenVideoTrack;
      screenAudioRef.current = screenAudioTrack;
      onScreenShare(screenVideoTrack, screenUid);

      // Handle browser's native "Stop sharing" button
      screenVideoTrack.on("track-ended", stopScreen);
    } catch (err) {
      // User cancelled the picker or other error
      if ((err as { name?: string }).name !== "NotAllowedError") {
        console.error("Screen share error:", err);
      }
    }
  }, [channelName, uid, onScreenShare, stopScreen]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreen();
    } else {
      await startScreen();
    }
  }, [isScreenSharing, stopScreen, startScreen]);

  // ── Recording ──

  const handleStartRecording = useCallback(async () => {
    setRecordingLoading(true);
    try {
      const recordingUid = String(uid + 100000);
      const tokenRes = await fetch(
        `/api/token?channel=${encodeURIComponent(channelName)}&uid=${recordingUid}`,
      );
      const { token: recToken } = await tokenRes.json();
      const acquireResult = await acquireRecording(channelName, recordingUid);
      console.log("[Recording] Acquire response:", JSON.stringify(acquireResult, null, 2));
      const startResult = await startRecording(channelName, recordingUid, acquireResult.resourceId, recToken);
      console.log("[Recording] Start response:", JSON.stringify(startResult, null, 2));
      const state: RecordingState = { resourceId: acquireResult.resourceId, sid: startResult.sid };
      localStorage.setItem(storageKey, JSON.stringify(state));
      setRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert(`Recording error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setRecordingLoading(false);
    }
  }, [channelName, uid, storageKey]);

  const handleStopRecording = useCallback(async () => {
    setRecordingLoading(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setRecording(false);
        return;
      }
      const state: RecordingState = JSON.parse(raw);
      const recordingUid = String(uid + 100000);
      const stopResult = await stopRecording(
        channelName,
        recordingUid,
        state.resourceId,
        state.sid,
      );
      console.log("[Recording] Stop response:", JSON.stringify(stopResult, null, 2));
      localStorage.removeItem(storageKey);
      setRecording(false);
    } catch (err) {
      console.error("Recording error:", err);
      alert(`Recording error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setRecordingLoading(false);
    }
  }, [channelName, uid, storageKey]);

  return (
    <div className="flex items-center justify-center gap-3 rounded-xl bg-gray-900/80 px-6 py-3 backdrop-blur">
      <button
        onClick={onToggleMic}
        className={`rounded-full p-3 transition ${micOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"}`}
        title={micOn ? "Mute mic" : "Unmute mic"}
      >
        <MicIcon muted={!micOn} />
      </button>

      <button
        onClick={onToggleCamera}
        className={`rounded-full p-3 transition ${cameraOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"}`}
        title={cameraOn ? "Turn off camera" : "Turn on camera"}
      >
        <CameraIcon off={!cameraOn} />
      </button>

      <button
        onClick={toggleScreenShare}
        className={`rounded-full p-3 transition ${isScreenSharing ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-700 hover:bg-gray-600"}`}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        <ScreenShareIcon />
      </button>

      {!recording ? (
        <button
          onClick={handleStartRecording}
          disabled={recordingLoading}
          className="rounded-full bg-gray-700 p-3 transition hover:bg-gray-600 disabled:opacity-50"
          title="Start recording"
        >
          {recordingLoading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <RecordIcon recording={false} />
          )}
        </button>
      ) : (
        <button
          onClick={handleStopRecording}
          disabled={recordingLoading}
          className="rounded-full bg-red-600 p-3 text-white transition hover:bg-red-500 disabled:opacity-50"
          title="Stop recording"
        >
          {recordingLoading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <RecordIcon recording={true} />
          )}
        </button>
      )}

      <div className="mx-2 h-8 w-px bg-gray-700" />

      <button
        onClick={onLeave}
        className="rounded-full bg-red-600 p-3 transition hover:bg-red-500"
        title="Leave meeting"
      >
        <PhoneOffIcon />
      </button>
    </div>
  );
}
