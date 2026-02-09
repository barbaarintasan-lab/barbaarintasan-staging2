import { useState, useEffect, useCallback } from 'react';

// Global listeners setup - only patch history methods once
let historyPatched = false;
const searchChangeListeners = new Set<() => void>();

function setupHistoryPatching() {
  if (historyPatched) return;
  historyPatched = true;

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function(data: any, unused: string, url?: string | URL | null) {
    originalPushState(data, unused, url);
    notifySearchListeners();
  };

  history.replaceState = function(data: any, unused: string, url?: string | URL | null) {
    originalReplaceState(data, unused, url);
    notifySearchListeners();
  };

  window.addEventListener('popstate', notifySearchListeners);
}

function notifySearchListeners() {
  searchChangeListeners.forEach(listener => listener());
}

/**
 * Custom location hook for wouter Router that only returns pathname
 * (so route matching works correctly)
 * 
 * Returns [pathname, navigate] tuple compatible with wouter's Router hook prop
 */
export function useBrowserLocation(): [string, (to: string, options?: { replace?: boolean }) => void] {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    setupHistoryPatching();

    const updatePathname = () => {
      setPathname(window.location.pathname);
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', updatePathname);

    // Also update on history changes
    searchChangeListeners.add(updatePathname);

    return () => {
      window.removeEventListener('popstate', updatePathname);
      searchChangeListeners.delete(updatePathname);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      history.replaceState(null, '', to);
    } else {
      history.pushState(null, '', to);
    }
  }, []);

  return [pathname, navigate];
}

/**
 * Helper hook to track search params changes
 * Returns the raw search string (e.g., "?room=123") for proper React dependency tracking
 */
export function useSearchString(): string {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    setupHistoryPatching();

    const updateSearch = () => {
      setSearch(window.location.search);
    };

    window.addEventListener('popstate', updateSearch);
    searchChangeListeners.add(updateSearch);

    return () => {
      window.removeEventListener('popstate', updateSearch);
      searchChangeListeners.delete(updateSearch);
    };
  }, []);

  return search;
}

/**
 * Helper hook to track search params changes
 * This listens to all history changes and updates when query string changes
 */
export function useSearchParams(): URLSearchParams {
  const search = useSearchString();
  return new URLSearchParams(search);
}
