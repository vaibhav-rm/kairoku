"use client";

import { useEffect, useState } from "react";
import { nowMs } from "@/lib/utils";

/**
 * A clock that re-renders the calling component on an interval so countdowns
 * tick live. Kept in a hook so render stays free of direct clock reads.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
