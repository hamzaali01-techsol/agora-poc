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
const S3_FILE_PREFIX = process.env.S3_FILE_PREFIX ?? "agora-recordings";

// Agora Cloud Recording uses numeric region codes for AWS S3
// Official mapping from https://github.com/agoraio/docs-source/blob/staging/cloud-recording/reference/region-vendor.mdx
const AWS_REGION_MAP: Record<string, number> = {
  "us-east-1": 0,
  "us-east-2": 1,
  "us-west-1": 2,
  "us-west-2": 3,
  "eu-west-1": 4,
  "eu-west-2": 5,
  "eu-west-3": 6,
  "eu-central-1": 7,
  "ap-southeast-1": 8,
  "ap-southeast-2": 9,
  "ap-northeast-1": 10,
  "ap-northeast-2": 11,
  "sa-east-1": 12,
  "ca-central-1": 13,
  "ap-south-1": 14,
  "cn-north-1": 15,
  "cn-northwest-1": 16,
  "af-south-1": 18,
  "ap-east-1": 19,
  "ap-northeast-3": 20,
  "eu-north-1": 21,
  "me-south-1": 22,
  "ap-southeast-3": 24,
  "eu-south-1": 25,
};

function getS3Region(): number {
  const raw = process.env.S3_REGION ?? "0";
  // Support both numeric ("0") and string ("eu-north-1") formats
  if (AWS_REGION_MAP[raw] !== undefined) return AWS_REGION_MAP[raw];
  const num = parseInt(raw, 10);
  return isNaN(num) ? 0 : num;
}

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
/*
export async function startIndividual(
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
        region: getS3Region(),
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
    throw new Error(`Agora individual start failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ sid: string; resourceId: string }>;
}
*/

/** Step 2b: Start composite recording with S3 upload */
export async function startComposite(
  channelName: string,
  uid: string,
  resourceId: string,
  token?: string,
) {
  const url = `${BASE_URL}/resourceid/${resourceId}/mode/mix/start`;

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
        transcodingConfig: {
          width: 1920,
          height: 1080,
          bitrate: 6000,
          fps: 30,
          mixedVideoLayout: 3, // Customized Layout
          backgroundColor: "#141414",
          layoutConfig: [
            {
              // Participant 1 (e.g., Camera) - Left half
              x_axis: 0.0,
              y_axis: 0.0,
              width: 0.5,
              height: 1.0,
              alpha: 1.0,
              render_mode: 1, // 1: Fit (Scaled to fit)
            },
            {
              // Participant 2 (e.g., Screen Share) - Right half
              x_axis: 0.5,
              y_axis: 0.0,
              width: 0.5,
              height: 1.0,
              alpha: 1.0,
              render_mode: 1,
            }
          ],
        },
        
      },
      recordingFileConfig: {
        avFileType: ["hls", "mp4"],
      },
      storageConfig: {
        vendor: 1, // AWS S3
        region: getS3Region(),
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
  mode: "mix" | "individual" = "mix",
) {
  const url = `${BASE_URL}/resourceid/${resourceId}/sid/${sid}/mode/${mode}/stop`;

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
export async function query(
  resourceId: string,
  sid: string,
  mode: "mix" | "individual" = "mix",
) {
  const url = `${BASE_URL}/resourceid/${resourceId}/sid/${sid}/mode/${mode}/query`;

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
