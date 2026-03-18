import { NextResponse } from "next/server";
import { RoomConfiguration } from "@livekit/protocol";
import { AccessToken, type AccessTokenOptions, type VideoGrant } from "livekit-server-sdk";
import { handleOptions, withCors } from "@/app/lib/api";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const DEFAULT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME ?? "hotel-agent";

export const revalidate = 0;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) {
      throw new Error("LIVEKIT_URL is not defined");
    }
    if (!API_KEY) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }
    if (!API_SECRET) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    const body = await req.json().catch(() => ({}));
    const requestedAgentName: string | undefined = body?.room_config?.agents?.[0]?.agent_name;
    const agentName = requestedAgentName || DEFAULT_AGENT_NAME;

    const participantName = "guest";
    const participantIdentity = `hotel_guest_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `hotel_concierge_${Math.floor(Math.random() * 10_000)}`;

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      agentName
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName,
    };

    return withCors(
      NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate token.";
    return withCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string
): Promise<string> {
  const token = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: "15m",
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  token.addGrant(grant);

  if (agentName) {
    token.roomConfig = new RoomConfiguration({
      agents: [{ agentName }],
    });
  }

  return token.toJwt();
}
