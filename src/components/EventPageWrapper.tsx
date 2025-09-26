import { useParams } from 'react-router-dom';
import EventPage from './EventPage';

const EventPageWrapper = () => {
  const { eventId } = useParams<{ eventId: string }>();
  return <EventPage eventId={eventId} />;
};

export default EventPageWrapper;
