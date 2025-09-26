import { useEffect } from 'react';
import { useEventData } from '../hooks';
import ChatInterface from './ChatInterface';
import { Loader2, AlertCircle } from 'lucide-react';

interface EventPageProps {
  eventId?: string;
}

const EventPage = ({ eventId }: EventPageProps) => {
  const { eventData, loading, error, refetch } = useEventData(eventId || '');

  useEffect(() => {
    if (!eventId) {
      console.error('No event ID provided');
    }
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Event Link</h1>
          <p className="text-gray-600">
            The event link appears to be invalid. Please check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full max-w-4xl mx-auto">
        <ChatInterface eventData={eventData} />
      </div>
    </div>
  );
};

export default EventPage;