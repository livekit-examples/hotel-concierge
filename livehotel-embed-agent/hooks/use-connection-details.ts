import { useCallback, useEffect, useState } from 'react';
import { decodeJwt } from 'jose';
import { ConnectionDetails } from '@/app/api/connection-details/route';
import { AppConfig } from '@/lib/types';

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;
const DEFAULT_AGENT_NAME = 'hotel-agent';

export default function useConnectionDetails(appConfig: AppConfig) {
  // Generate room connection details, including:
  //   - A random Room name
  //   - A random Participant name
  //   - An Access Token to permit the participant to join the room
  //   - The URL of the LiveKit server to connect to
  //
  // In real-world application, you would likely allow the user to specify their
  // own participant name, and possibly to choose from existing rooms to join.

  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);

  const getConnectionDetailsUrl = useCallback(() => {
    const rawEndpoint = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT;
    const sameOriginUrl = new URL('/api/connection-details', window.location.origin);

    let endpoint: URL;
    try {
      endpoint = new URL(rawEndpoint ?? sameOriginUrl.toString(), window.location.origin);
    } catch {
      endpoint = sameOriginUrl;
    }

    // Avoid mixed-content failures when the host app is served over HTTPS.
    // If the configured endpoint is insecure and cross-origin, force same-origin.
    if (window.location.protocol === 'https:' && endpoint.protocol === 'http:') {
      if (endpoint.hostname === window.location.hostname) {
        endpoint.protocol = 'https:';
      } else {
        endpoint = sameOriginUrl;
      }
    }

    // Local dev endpoint accidentally bundled into a production host.
    if (
      (endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1') &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      endpoint = sameOriginUrl;
    }

    return endpoint;
  }, []);

  const fetchConnectionDetails = useCallback(async () => {
    setConnectionDetails(null);
    const url = getConnectionDetailsUrl();

    const agentName = appConfig.agentName ?? DEFAULT_AGENT_NAME;

    let data: ConnectionDetails;
    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Id': appConfig.sandboxId ?? '',
        },
        body: JSON.stringify({
          room_config: agentName
            ? {
                agents: [{ agent_name: agentName }],
              }
            : undefined,
        }),
      });
      data = await res.json();
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }

    setConnectionDetails(data);
    return data;
  }, [appConfig.agentName, appConfig.sandboxId, getConnectionDetailsUrl]);

  useEffect(() => {
    fetchConnectionDetails();
  }, [fetchConnectionDetails]);

  const isConnectionDetailsExpired = useCallback(() => {
    const token = connectionDetails?.participantToken;
    if (!token) {
      return true;
    }

    const jwtPayload = decodeJwt(token);
    if (!jwtPayload.exp) {
      return true;
    }
    const expiresAt = new Date(jwtPayload.exp - ONE_MINUTE_IN_MILLISECONDS);

    const now = new Date();
    return expiresAt >= now;
  }, [connectionDetails?.participantToken]);

  const existingOrRefreshConnectionDetails = useCallback(async () => {
    if (isConnectionDetailsExpired() || !connectionDetails) {
      return fetchConnectionDetails();
    } else {
      return connectionDetails;
    }
  }, [connectionDetails, fetchConnectionDetails, isConnectionDetailsExpired]);

  return {
    connectionDetails,
    refreshConnectionDetails: fetchConnectionDetails,
    existingOrRefreshConnectionDetails,
  };
}
