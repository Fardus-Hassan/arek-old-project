import { useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * Hydration-safe client flag.
 * Returns false on server and initial hydration pass, then true on client.
 */
export function useIsClient(): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const id = window.setTimeout(callback, 0);
    return () => window.clearTimeout(id);
  };

  return useSyncExternalStore(
    subscribe,
    () => typeof window !== "undefined",
    () => false,
  );
}
