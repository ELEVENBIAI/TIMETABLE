import { useEffect, useState } from 'react';

/**
 * Reactiver Hook für CSS-Media-Queries. SSR-sicher (initial state defaults to false).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Initial sync (falls Query sich seit dem ersten Render geändert hat)
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Convenience: ≥ 768px (Tailwind md breakpoint) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
