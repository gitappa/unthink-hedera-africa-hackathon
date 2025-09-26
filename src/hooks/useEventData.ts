import { useState, useEffect } from 'react';
import type { EventData } from '../types';
import { eventApi } from '../services/api';

export const useEventData = (eventId: string) => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await eventApi.getEventById(eventId);
      setEventData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event data');
      console.error('Event data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  return { eventData, loading, error, refetch: fetchEventData };
};