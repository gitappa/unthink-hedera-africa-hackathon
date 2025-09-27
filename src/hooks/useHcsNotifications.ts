import { useEffect, useRef } from 'react';

type NotificationMessage = {
  email: string;
  message: string;
  eventId?: string;
};

interface UseHcsNotificationsParams {
  userEmail?: string | null;
  eventId?: string;
  onMatch: (msg: string) => void;
  pollMs?: number;
}

export function useHcsNotifications({ userEmail, eventId, onMatch, pollMs = 4000 }: UseHcsNotificationsParams) {
  const lastConsensusTimeRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userEmail) return;

    let intervalId: any;
    const normalized = userEmail.trim().toLowerCase();

    const fetchMessages = async () => {
      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        // Mirror node public endpoint for topic messages; expects VITE_HCS_TARGET_TOPIC_ID
        const topicId = "0.0.5999297";
        if (!topicId) return;

        const baseUrl = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`;
        const since = lastConsensusTimeRef.current ? `?timestamp=gt:${lastConsensusTimeRef.current}` : '';
        const res = await fetch(baseUrl + since, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data?.messages || []) as any[];
        // console.log('[HCS] Mirror returned messages:', list);
        if (list.length > 0) {
          console.log('[HCS] Mirror returned messages:', list.length);
        }
        for (const item of list) {
          // Update lastConsensusTimeRef
          if (item.consensus_timestamp) {
            lastConsensusTimeRef.current = item.consensus_timestamp;
          }
          const base64 = item.message as string;
          if (!base64) continue;
          try {
            const decoded = atob(base64);
            console.log('[HCS] Decoded message:', decoded);
            const parsed: NotificationMessage = JSON.parse(decoded);
            const eventMatch = eventId ? parsed?.eventId === eventId : true;
            if (eventMatch && parsed?.email?.trim().toLowerCase() === normalized && parsed.message) {
              console.log('[HCS] Matched message for user', normalized, 'event', eventId, '->', parsed.message);
              onMatch(parsed.message);
            }
          } catch {}
        }
      } catch {}
    };

    // initial fetch and start polling
    fetchMessages();
    intervalId = setInterval(fetchMessages, pollMs);

    return () => {
      clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [userEmail, eventId, onMatch, pollMs]);
}


