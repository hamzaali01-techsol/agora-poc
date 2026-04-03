export interface RecordingState {
  resourceId: string;
  sid: string;
}

export async function acquireRecording(channelName: string, uid: string) {
  const res = await fetch("/api/recording/acquire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, uid }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ resourceId: string }>;
}

export async function startRecording(
  channelName: string,
  uid: string,
  resourceId: string,
  token?: string,
  mode: "mix" | "individual" = "mix",
) {
  const res = await fetch("/api/recording/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, uid, resourceId, token, mode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ sid: string; resourceId: string }>;
}

export async function stopRecording(
  channelName: string,
  uid: string,
  resourceId: string,
  sid: string,
  mode: "mix" | "individual" = "mix",
) {
  const res = await fetch("/api/recording/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, uid, resourceId, sid, mode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function queryRecording(
  resourceId: string,
  sid: string,
  mode: "mix" | "individual" = "mix",
) {
  const params = new URLSearchParams({ resourceId, sid, mode });
  const res = await fetch(`/api/recording/query?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
