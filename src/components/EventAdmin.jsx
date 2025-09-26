import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./EventEdit.css";

export default function EventAdmin() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const params = useParams()
  const hasFetched = useRef(false); // 👈 Add this

  useEffect(() => {
    if (hasFetched.current) return; // 👈 Prevent repeated calls
    hasFetched.current = true;

    const fetchStats = async () => {
      try {
        const res = await axios.get(
          `https://auraprod.unthink.ai/agent_collection/get/service_id/${params.eventId}`
        );
        setData(res?.data?.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [params.eventId]);

  if (!data) return <div>Loading...</div>;

  const handleEditNavigate = () => {
    navigate(`/event/${params.eventId}/edit`, {
      state: { eventData: data },
    });
  };

  const handleStatsNavigate = () => {
    navigate(`/event/${params.eventId}/stats`);
  };

  return (
    <div className="event-box_div">
      <div className="event-box">
        <p className="event-title">{data.service_name} event name</p>
        <button className="event-button" onClick={handleEditNavigate}>
          edit
        </button>
        <button className="event-button" onClick={handleStatsNavigate}>
          stats
        </button>
      </div>
    </div>
  );
}
