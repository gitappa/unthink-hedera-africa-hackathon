import { useState } from 'react';
import { hcsApi } from '../services/api';
import { useParams } from 'react-router-dom';

const AdminMessenger = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const { eventId } = useParams();

  const handleSend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMessage = message.trim();
    if (!trimmedEmail || !trimmedMessage) {
      setStatus('Please provide both email and message.');
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const ok = await hcsApi.sendAdminMessage({ email: trimmedEmail, message: trimmedMessage, eventId: eventId || '' });
      if (ok) {
        setStatus('Message sent');
        setMessage('');
      } else {
        setStatus('Failed to send');
      }
    } catch (e) {
      setStatus('Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="text-lg font-semibold">Admin Messenger</h2>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Recipient email"
          className="w-full border rounded px-3 py-2"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          rows={4}
          className="w-full border rounded px-3 py-2"
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-purple-600 text-white rounded py-2 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
        {status && <div className="text-sm text-gray-600">{status}</div>}
        <div className="text-xs text-gray-500">Event ID: {eventId || 'unknown'}</div>
      </div>
    </div>
  );
};

export default AdminMessenger;


