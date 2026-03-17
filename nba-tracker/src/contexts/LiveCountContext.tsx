import { createContext, useContext, useState, type ReactNode } from 'react';

type LiveCountContextValue = { liveCount: number; setLiveCount: (n: number) => void };

const LiveCountContext = createContext<LiveCountContextValue | null>(null);

export function LiveCountProvider({ children }: { children: ReactNode }) {
  const [liveCount, setLiveCount] = useState(0);
  return (
    <LiveCountContext.Provider value={{ liveCount, setLiveCount }}>
      {children}
    </LiveCountContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives with provider
export function useLiveCount(): LiveCountContextValue {
  const ctx = useContext(LiveCountContext);
  if (!ctx) return { liveCount: 0, setLiveCount: () => {} };
  return ctx;
}
