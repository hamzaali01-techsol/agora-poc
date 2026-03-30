/**
 * Server-side helpers for Agora Cloud Recording REST API.
 * These run in Next.js API routes only — never exposed to the client.
 */

const AGORA_APP_ID = process.env.AGORA_APP_ID!;
const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;

// S3 storage config
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY!;
const S3_REGION = parseInt(process.env.S3_REGION ?? "0", 10); // 0=US_EAST_1, 1=US_EAST_2, etc.
const S3_FILE_PREFIX = process.env.S3_FILE_PREFIX ?? "agora-recordings";

const BASE_URL = `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording`;

function authHeader(): string {
  const credentials = Buffer.from(
    `${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

const headers = {
  "Content-Type": "application/json;charset=utf-8",
  Authorization: authHeader(),
};

/** Step 1: Acquire a recording resource */
export async function acquire(channelName: string, uid: string) {
  const res = await fetch(`${BASE_URL}/acquire`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cname: channelName,
      uid,
      clientRequest: {
        resourceExpiredHour: 24,
        scene: 0,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agora acquire failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ resourceId: string }>;
}

/** Step 2: Start individual recording with S3 upload */
export async function start(
  channelName: string,
  uid: string,
  resourceId: string,
  token?: string,
) {
  const url = `${BASE_URL}/resourceid/${resourceId}/mode/individual/start`;

  const body = {
    uid,
    cname: channelName,
    clientRequest: {
      token: token || undefined,
      recordingConfig: {
        maxIdleTime: 30,
        streamTypes: 2, // audio + video
        channelType: 0, // communication
        videoStreamType: 0, // high stream
        subscribeUidGroup: 0,
        streamMode: "standard",
      },
      recordingFileConfig: {
        avFileType: ["hls"],
      },
      storageConfig: {
        vendor: 1, // AWS S3
        region: S3_REGION,
        bucket: S3_BUCKET,
        accessKey: S3_ACCESS_KEY,
        secretKey: S3_SECRET_KEY,
        fileNamePrefix: S3_FILE_PREFIX.split("/").filter(Boolean),
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agora start failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ sid: string; resourceId: string }>;
}

/** Step 3: Stop recording */
export async function stop(
  channelName: string,
  uid: string,
  resourceId: string,
  sid: string,
) {
  const url = `${BASE_URL}/resourceid/${resourceId}/sid/${sid}/mode/individual/stop`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cname: channelName,
      uid,
      clientRequest: {},
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agora stop failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Query recording status */
export async function query(resourceId: string, sid: string) {
  const url = `${BASE_URL}/resourceid/${resourceId}/sid/${sid}/mode/individual/query`;

  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agora query failed (${res.status}): ${text}`);
  }

  return res.json();
}
