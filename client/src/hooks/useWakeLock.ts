import { useEffect, useRef } from "react";

export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let isActive = true;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator && enabled && isActive) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");

          wakeLockRef.current?.addEventListener("release", () => {
          });
        }
      } catch (err) {
        console.error("[WakeLock] Error:", err);
      }
    }

    async function handleVisibilityChange() {
      if (document.visibilityState === "visible" && enabled && isActive) {
        await requestWakeLock();
      }
    }

    if (enabled) {
      requestWakeLock();
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}
