/** History adapter: React search string <-> location.search via push/replace/popstate. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSeed } from "../model/rng";
import type { DrillSettings } from "../model/session";
import { isNonGenerationSearchChange, parseSearch, serializeSearch } from "../model/settingsSearch";

export type SettingsSearchApi = {
  settings: DrillSettings;
  loadError: boolean;
  commit: (settings: DrillSettings) => void;
};

type CanonicalSearch = {
  search: string;
  loadError: boolean;
};

/** Last ensure result; Strict Mode double-init must not create again for the same raw. */
let lastEnsure: { raw: string; canonical: CanonicalSearch } | null = null;

function readWindowSearch(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.search;
}

function historyUrl(search: string): string {
  return `${window.location.pathname}${search}`;
}

/**
 * Parse raw search; create seed when needsSeed; serialize. shouldReplace on create, loadError,
 * or non-canonical form. loadError stays from parse (invalid seed true; missing false).
 */
function recoverFromSearch(rawSearch: string): {
  search: string;
  loadError: boolean;
  shouldReplace: boolean;
} {
  const parsed = parseSearch(rawSearch);
  let settings = parsed.settings;
  let didCreate = false;
  if (parsed.needsSeed) {
    settings = { ...settings, seed: createSeed() };
    didCreate = true;
  }
  const canonical = serializeSearch(settings);
  const shouldReplace = didCreate || parsed.loadError || canonical !== rawSearch;
  return {
    search: shouldReplace ? canonical : rawSearch,
    loadError: parsed.loadError,
    shouldReplace,
  };
}

/**
 * Sync read of location.search with one create+replace per raw (Strict Mode safe).
 * After replace, a second read that sees the seeded URL does not create again.
 */
function ensureCanonicalSearch(): CanonicalSearch {
  const raw = readWindowSearch();
  if (lastEnsure !== null && (lastEnsure.raw === raw || lastEnsure.canonical.search === raw)) {
    return lastEnsure.canonical;
  }
  const recovered = recoverFromSearch(raw);
  if (typeof window !== "undefined" && recovered.shouldReplace) {
    window.history.replaceState(null, "", historyUrl(recovered.search));
  }
  const canonical: CanonicalSearch = {
    search: recovered.search,
    loadError: recovered.loadError,
  };
  lastEnsure = { raw, canonical };
  return canonical;
}

export function useSettingsSearch(): SettingsSearchApi {
  const [initial] = useState(ensureCanonicalSearch);
  const [search, setSearch] = useState(initial.search);
  const [loadError, setLoadError] = useState(initial.loadError);
  /** Last written search; dedupes rapid duplicate commits before React state catches up. */
  const lastWrittenSearchRef = useRef(search);

  useEffect(() => {
    const onPopState = () => {
      lastEnsure = null;
      const recovered = recoverFromSearch(window.location.search);
      if (recovered.shouldReplace) {
        window.history.replaceState(null, "", historyUrl(recovered.search));
      }
      lastWrittenSearchRef.current = recovered.search;
      setSearch(recovered.search);
      setLoadError(recovered.loadError);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const commit = useCallback((nextSettings: DrillSettings) => {
    const prev = lastWrittenSearchRef.current;
    const next = serializeSearch(nextSettings);
    if (next === prev) {
      lastEnsure = null;
      setLoadError(false);
      return;
    }
    // Seed is always serialized. Non-generation (bpm/view): replace. Gen/seed changes: push.
    // Caller supplies seed; commit does not create.
    if (isNonGenerationSearchChange(prev, nextSettings)) {
      window.history.replaceState(null, "", historyUrl(next));
    } else {
      window.history.pushState(null, "", historyUrl(next));
    }
    lastEnsure = null;
    lastWrittenSearchRef.current = next;
    setSearch(next);
    setLoadError(false);
  }, []);

  const settings = useMemo(() => parseSearch(search).settings, [search]);

  return { settings, loadError, commit };
}
