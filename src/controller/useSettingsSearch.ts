/** History adapter: React search string <-> location.search via push/replace/popstate. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DrillSettings } from "../model/session";
import { parseSearch, serializeSearch } from "../model/settingsSearch";

export type SettingsSearchApi = {
  settings: DrillSettings;
  loadError: boolean;
  commit: (settings: DrillSettings) => void;
};

function readWindowSearch(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.search;
}

function historyUrl(search: string): string {
  return `${window.location.pathname}${search}`;
}

function recoverFromSearch(rawSearch: string): {
  search: string;
  loadError: boolean;
  shouldReplace: boolean;
} {
  const parsed = parseSearch(rawSearch);
  const canonical = serializeSearch(parsed.settings);
  const shouldReplace = parsed.loadError || canonical !== rawSearch;
  return {
    search: shouldReplace ? canonical : rawSearch,
    loadError: parsed.loadError,
    shouldReplace,
  };
}

export function useSettingsSearch(): SettingsSearchApi {
  const [search, setSearch] = useState(readWindowSearch);
  const [loadError, setLoadError] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return parseSearch(window.location.search).loadError;
  });

  useEffect(() => {
    const recovered = recoverFromSearch(window.location.search);
    if (recovered.shouldReplace) {
      window.history.replaceState(null, "", historyUrl(recovered.search));
      setSearch(recovered.search);
    }
    if (recovered.loadError) {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const recovered = recoverFromSearch(window.location.search);
      if (recovered.shouldReplace) {
        window.history.replaceState(null, "", historyUrl(recovered.search));
      }
      setSearch(recovered.search);
      setLoadError(recovered.loadError);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const commit = useCallback(
    (nextSettings: DrillSettings) => {
      const next = serializeSearch(nextSettings);
      if (next === search) {
        setLoadError(false);
        return;
      }
      if (next === "") {
        window.history.replaceState(null, "", historyUrl(""));
      } else {
        window.history.pushState(null, "", historyUrl(next));
      }
      setSearch(next);
      setLoadError(false);
    },
    [search],
  );

  const settings = useMemo(() => parseSearch(search).settings, [search]);

  return { settings, loadError, commit };
}
