"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AgoraRTC from "agora-rtc-react";
import type { ILocalVideoTrack } from "agora-rtc-sdk-ng";
import { useRTCClient } from "agora-rtc-react";
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
  onScreenShareTrack: (track: ILocalVideoTrack | null) => void;
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
  onScreenShareTrack,
  isScreenSharing,
}: ControlsProps) {
  const client = useRTCClient();
  const [recording, setRecording] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const recordingRef = useRef<RecordingState | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);

  // Cleanup screen track on unmount
  useEffect(() => {
    return () => {
      if (screenTrackRef.current) {
        screenTrackRef.current.close();
      }
    };
  }, []);

  // ── Screen sharing ──

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing && screenTrackRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.unpublish([screenTrackRef.current] as any);
      screenTrackRef.current.close();
      screenTrackRef.current = null;
      onScreenShareTrack(null);
      return;
    }

    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1" },
        "disable",
      );
      const videoTrack = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.publish([videoTrack] as any);
      screenTrackRef.current = videoTrack as ILocalVideoTrack;
      onScreenShareTrack(videoTrack as ILocalVideoTrack);

      // Stop sharing when the browser's native "Stop sharing" is clicked
      videoTrack.on("track-ended", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.unpublish([videoTrack] as any);
        videoTrack.close();
        screenTrackRef.current = null;
        onScreenShareTrack(null);
      });
    } catch (err) {
      // User cancelled the screen share picker
      console.log("Screen share cancelled:", err);
    }
  }, [client, isScreenSharing, onScreenShareTrack]);

  // ── Recording ──

  const toggleRecording = useCallback(async () => {
    setRecordingLoading(true);
    try {
      if (recording && recordingRef.current) {
        await stopRecording(
          channelName,
          String(uid),
          recordingRef.current.resourceId,
          recordingRef.current.sid,
        );
        recordingRef.current = null;
        setRecording(false);
      } else {
        // The recording bot UID must differ from any participant
        const recordingUid = String(uid + 100000);
        const { resourceId } = await acquireRecording(channelName, recordingUid);
        const { sid } = await startRecording(channelName, recordingUid, resourceId);
        recordingRef.current = { resourceId, sid };
        setRecording(true);
      }
    } catch (err) {
      console.error("Recording error:", err);
      alert(`Recording error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setRecordingLoading(false);
    }
  }, [recording, channelName, uid]);

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

      <button
        onClick={toggleRecording}
        disabled={recordingLoading}
        className={`rounded-full p-3 transition ${recording ? "bg-red-600 text-white hover:bg-red-500" : "bg-gray-700 hover:bg-gray-600"} disabled:opacity-50`}
        title={recording ? "Stop recording" : "Start recording"}
      >
        {recordingLoading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <RecordIcon recording={recording} />
        )}
      </button>

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
