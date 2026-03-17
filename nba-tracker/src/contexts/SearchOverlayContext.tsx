import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type SearchOverlayContextValue = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(null);

export function SearchOverlayProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);
  return (
    <SearchOverlayContext.Provider value={{ open, openSearch, closeSearch }}>
      {children}
    </SearchOverlayContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives with provider
export function useSearchOverlay() {
  const ctx = useContext(SearchOverlayContext);
  if (!ctx) {
    return { open: false, openSearch: () => {}, closeSearch: () => {} };
  }
  return ctx;
}
