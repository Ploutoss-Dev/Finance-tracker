'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PrivacyContextValue {
  /** Whether values are currently hidden. */
  isPrivate: boolean;
  /** Toggle privacy mode on/off. */
  toggle: () => void;
  /**
   * Pass any formatted string through this function.
   * When private, returns the masked placeholder instead.
   */
  mask: (value: string) => string;
}

// ── Context ───────────────────────────────────────────────────────────────────

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivate: false,
  toggle: () => {},
  mask: (v) => v,
});

const STORAGE_KEY = 'finance-privacy-mode';
const MASK = '••••••';

// ── Provider ──────────────────────────────────────────────────────────────────

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);
  // Track first-render hydration so we don't flash the wrong state
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        setIsPrivate(true);
      }
    } catch {
      // localStorage unavailable (SSR guard)
    }
    hydratedRef.current = true;
  }, []);

  const toggle = useCallback(() => {
    setIsPrivate((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const mask = useCallback(
    (value: string) => (isPrivate ? MASK : value),
    [isPrivate]
  );

  return (
    <PrivacyContext.Provider value={{ isPrivate, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Use anywhere inside the component tree to read/toggle privacy mode.
 *
 * ```tsx
 * const { mask } = usePrivacy();
 * return <p>{mask(fmt(amount))}</p>;
 * ```
 */
export function usePrivacy() {
  return useContext(PrivacyContext);
}
