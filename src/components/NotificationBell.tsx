import { useMemo } from 'react';
import { Bell } from 'lucide-react';

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
}

const NotificationBell = ({ notifications, open, onToggle, onClear }: Props) => {
  const unreadCount = notifications.length;
  const sorted = useMemo(() => [...notifications].sort((a, b) => b.timestamp - a.timestamp), [notifications]);

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
              sorted.map((n) => (
                <div key={n.id} className="p-3">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.message}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;


