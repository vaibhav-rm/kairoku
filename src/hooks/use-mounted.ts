"use client";

import { useSyncExternalStore } from "react";

/**
 * False on the server and during hydration, true afterwards.
 * Gate any nondeterministic render output (live countdowns, locale dates,
 * client-only session state) behind this so SSR HTML always matches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
