import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { userApi, hcsApi } from '../services/api';

export interface NotificationItem {
  id: string;
  message: string;
  timestamp: number;
}

interface Props {
  notifications: NotificationItem[];
  open: boolean;
  onToggle: () => void;
  onClear?: () => void;
  eventId?: string;
  emailId?: string;
}

const NotificationBell = ({ notifications, open, onToggle, onClear, eventId: propEventId,emailId: propEmailId}: Props) => {
  const filtered = useMemo(
    () => notifications.filter((n) => n.message?.startsWith('Request')),
    [notifications]
  );
  const unreadCount = filtered.length;
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.timestamp - a.timestamp),
    [filtered]
  );

  const addAlertToFirestore = async (
    collectionPath: string,
    name: string,
    emailId: string,
    requestStatus: string,
    eventId: string,
  ) => {
    try {
      const alertsCollection = collection(db, 'test alert');
      
      const alertData = {
        collection_path: collectionPath,
        name: name,
        emaild_id: emailId,
        event_id: eventId,
        alert_type: 'request_status',
        request_status: requestStatus,
        timestamp: serverTimestamp() 
      };
      
      const docRef = await addDoc(alertsCollection, alertData);
      console.log('Alert added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding alert:', error);
      throw error;
    }
  };
  
  const renderWithLinks = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/g; // non-capturing split of full URLs only
    const exactUrlPattern = /^(?:https?:\/\/[^\s]+|www\.[^\s]+)$/; // exact match checker
    const parts = text.split(urlPattern);
    return parts.map((part, index) => {
      const isUrl = exactUrlPattern.test(part);
      if (isUrl) {
        const href = part.startsWith('http') ? part : `http://${part}`;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            link
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const extractFirstUrl = (text: string): string | null => {
    const match = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
    if (!match) return null;
    const raw = match[0];
    return raw.startsWith('http') ? raw : `http://${raw}`;
  };

  const resolveNameByEmail = async (emailId?: string): Promise<string> => {
    if (!emailId) return '';
    try {
      const data = await userApi.validateByEmail(emailId);
      if (!data) return '';
      if (data.first_name && typeof data.first_name === 'string' && data.first_name.trim() !== '') {
        return data.first_name.trim();
      }
      if (data.name && typeof data.name === 'string' && data.name.trim() !== '') {
        return data.name.trim();
      }
      if (data.user_name && typeof data.user_name === 'string' && data.user_name.trim() !== '') {
        return data.user_name.trim();
      }
      return '';
    } catch {
      return '';
    }
  };

  
  const handleDecision = async (n: NotificationItem, decision: 'approved' | 'declined') => {
    try {
      const collectionPath = extractFirstUrl(n.message) || '';
      const emailId = propEmailId || '';
      const eventId = propEventId || '';
      const name = await resolveNameByEmail(emailId);
      // Send lightweight HCS message first
      const simpleMessage = `Permission from ${name || 'User'} is ${decision} for ${collectionPath || ''}`;
      try {
        await hcsApi.sendAdminMessage({ email: emailId, message: simpleMessage, eventId });
      } catch (e) {
        console.error('Failed to publish to HCS', e);
      }
      await addAlertToFirestore(collectionPath, name, emailId, decision, eventId);
    } catch (err) {
      console.error('Failed to record decision', err);
    }
  };

  return (
    <>
      <button
        aria-label="Notifications"
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 rounded-full bg-white shadow-lg border p-2 hover:bg-gray-50"
      >
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-800" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-5 text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="fixed top-16 right-4 z-50 w-80 max-h-[60vh] bg-white border rounded-lg shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-semibold">Notifications</span>
            <div className="space-x-2">
              {onClear && (
                <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
              )}
              <button onClick={onToggle} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
            </div>
          </div>
          <div className="overflow-y-auto divide-y" style={{ scrollbarGutter: 'stable' }}>
            {sorted.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              sorted.map((n) => {
                console.log('NotificationBell item:', n);
                return (
                <div key={n.id} className="p-3">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{renderWithLinks(n.message)}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</div>
                  <div className="mt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => handleDecision(n, 'declined')}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                      onClick={() => handleDecision(n, 'approved')}
                    >
                      Approve
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;


