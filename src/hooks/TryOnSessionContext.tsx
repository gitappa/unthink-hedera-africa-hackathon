import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';

interface TryOnSessionState {
  baseImageUrls: string[];
  setBaseImageUrls: Dispatch<SetStateAction<string[]>>;
  clear: () => void;
}

const TryOnSessionContext = createContext<TryOnSessionState | undefined>(undefined);

export const TryOnSessionProvider = ({ children }: { children: ReactNode }) => {
  const [baseImageUrls, setBaseImageUrls] = useState<string[]>([]);

  const value = useMemo(() => ({
    baseImageUrls,
    setBaseImageUrls,
    clear: () => setBaseImageUrls([])
  }), [baseImageUrls]);

  return (
    <TryOnSessionContext.Provider value={value}>
      {children}
    </TryOnSessionContext.Provider>
  );
};

export const useTryOnSession = (): TryOnSessionState => {
  const ctx = useContext(TryOnSessionContext);
  if (!ctx) {
    throw new Error('useTryOnSession must be used within a TryOnSessionProvider');
  }
  return ctx;
};


