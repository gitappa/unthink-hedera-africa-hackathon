import { useState, useEffect } from 'react';
import { healthCheck } from '../services/api';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isApiReachable, setIsApiReachable] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const healthy = await healthCheck();
        setIsApiReachable(healthy);
      } catch {
        setIsApiReachable(false);
      }
    };

    if (isOnline) {
      checkApiHealth();
      // Check API health every 30 seconds when online
      const interval = setInterval(checkApiHealth, 30000);
      return () => clearInterval(interval);
    } else {
      setIsApiReachable(false);
    }
  }, [isOnline]);

  return {
    isOnline,
    isApiReachable,
    isConnected: isOnline && isApiReachable
  };
};