import { useEffect, useRef } from 'react';

type NotificationMessage = {
  email_id: string;
  message: string;
  event_id?: string;
};

interface UseHcsNotificationsParams {
  userEmail?: string | null;
  eventId?: string;
  onMatch: (msg: string) => void;
  pollMs?: number;
}

export function useHcsNotifications({ userEmail, eventId, onMatch, pollMs = 4000 }: UseHcsNotificationsParams) {
  const abortRef = useRef<AbortController | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const onMatchRef = useRef(onMatch);

  // Keep latest callback without retriggering main effect
  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    if (!userEmail) return;

    let intervalId: any;
    const normalized = userEmail.trim().toLowerCase();

    // Reset dedupe cache when user or event context changes
    seenRef.current.clear();

    const fetchMessages = async () => {
      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        // Call our server endpoint instead of using HCS10Client directly
        const res = await fetch('/api/hcs/messages', { signal: controller.signal });
        if (!res.ok) return;
        
        const data = await res.json();
        const messages = data?.messages || [];
        
        if (messages.length > 0) {
          console.log('[HCS] Server returned messages:', messages.length);
        }

        for (const msg of messages) {
          if (msg.op === 'message' && msg.data) {
            console.log('[HCS] Message:', typeof(msg.data));
            try {
              const parsed: NotificationMessage = JSON.parse(msg.data);
              console.log('[HCS] Parsed message:', parsed);
              const eventMatch = eventId ? parsed?.event_id === eventId : true;
              if (eventMatch && parsed?.email_id?.trim().toLowerCase() === normalized && parsed.message) {
                const key = `${parsed.email_id?.trim().toLowerCase() || ''}|${parsed.event_id || ''}|${parsed.message}`;
                if (seenRef.current.has(key)) {
                  continue;
                }
                seenRef.current.add(key);
                console.log('[HCS] Matched message for user', normalized, 'event', eventId, '->', parsed.message);
                onMatchRef.current(parsed.message);
              }
            } catch (error) {
              console.error('[HCS] Error parsing message:', error);
            }
          }
        }
      } catch (error) {
        console.error('[HCS] Error fetching messages:', error);
      }
    };

    // initial fetch and start polling
    fetchMessages();
    intervalId = setInterval(fetchMessages, pollMs);

    return () => {
      clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [userEmail, eventId, pollMs]);
}