import { useEffect, useRef } from "react";

const recentRequestStarts = new Map<string, number>();
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const recentGetResponses = new Map<string, { expiresAt: number; data: unknown }>();

type RequestPriority = "high" | "low";

interface TrackedFetchOptions {
  priority?: RequestPriority;
  dedupeWindowMs?: number;
  slowThresholdMs?: number;
}

async function throwIfResponseNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  const text = (await response.text()) || response.statusText;
  throw new Error(`${response.status}: ${text}`);
}

function buildRequestKey(url: string, init?: RequestInit): string {
  const method = (init?.method || "GET").toUpperCase();
  const credentials = init?.credentials || "same-origin";
  return `${method}:${url}:${credentials}`;
}

export async function trackedFetchJson<T>(
  url: string,
  init?: RequestInit,
  source = "unknown",
  options?: TrackedFetchOptions,
): Promise<T> {
  const priority = options?.priority ?? "high";
  const dedupeWindowMs = options?.dedupeWindowMs ?? 2000;
  const slowThresholdMs = options?.slowThresholdMs ?? 300;
  const requestKey = buildRequestKey(url, init);
  const method = (init?.method || "GET").toUpperCase();
  const now = Date.now();
  const lastStartedAt = recentRequestStarts.get(requestKey);

  if (lastStartedAt && now - lastStartedAt < dedupeWindowMs) {
    console.warn(`[perf] Duplicate fetch suppressed window hit: ${url}`, {
      source,
      deltaMs: now - lastStartedAt,
      method,
      dedupeWindowMs,
    });
  }

  recentRequestStarts.set(requestKey, now);

  if (method === "GET") {
    const recent = recentGetResponses.get(requestKey);
    if (recent && recent.expiresAt > now) {
      return recent.data as T;
    }

    const inFlight = inFlightGetRequests.get(requestKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const headers = new Headers(init?.headers);
  headers.set("x-request-priority", priority);

  const requestStart = typeof performance !== "undefined" ? performance.now() : Date.now();

  const makeRequest = () =>
    fetch(url, { ...init, headers })
    .then(async (response) => {
      await throwIfResponseNotOk(response);
      return response.json() as Promise<T>;
    })
    .then((payload) => {
      const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - requestStart;
      if (elapsedMs > slowThresholdMs) {
        console.warn(`[perf] Slow API detected: ${url}`, {
          source,
          method,
          elapsedMs: Math.round(elapsedMs),
          priority,
        });
      }
      if (method === "GET") {
        recentGetResponses.set(requestKey, {
          expiresAt: Date.now() + dedupeWindowMs,
          data: payload,
        });
      }
      return payload;
    })
    .finally(() => {
      if (method === "GET") {
        inFlightGetRequests.delete(requestKey);
      }
    });

  const requestPromise =
    priority === "low"
      ? new Promise<T>((resolve, reject) => {
          scheduleIdleTask(() => {
            makeRequest().then(resolve).catch(reject);
          }, 300);
        })
      : makeRequest();

  if (method === "GET") {
    inFlightGetRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
}

export function useExcessiveRenderWarning(
  componentName: string,
  threshold = 3,
  windowMs = 700,
): void {
  const renderTimesRef = useRef<number[]>([]);
  const lastWarningAtRef = useRef(0);

  useEffect(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    renderTimesRef.current = renderTimesRef.current.filter((time) => now - time < windowMs);
    renderTimesRef.current.push(now);

    if (
      renderTimesRef.current.length >= threshold &&
      now - lastWarningAtRef.current >= windowMs
    ) {
      lastWarningAtRef.current = now;
      console.warn(`[perf] Excessive re-renders detected: ${componentName}`, {
        renders: renderTimesRef.current.length,
        windowMs,
      });
    }
  });
}

export function useSlowRenderWarning(componentName: string, thresholdMs = 16): void {
  const renderStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

  useEffect(() => {
    const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedMs = finishedAt - renderStartedAt;
    if (elapsedMs > thresholdMs) {
      console.warn(`[perf] Slow render detected: ${componentName}`, {
        elapsedMs: Math.round(elapsedMs),
        thresholdMs,
      });
    }
  });
}

export function useDroppedFrameWarning(componentName: string, frameBudgetMs = 16): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
      return;
    }

    let frameId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const frameDelta = now - previous;
      if (frameDelta > frameBudgetMs * 2) {
        console.warn(`[perf] Dropped frame warning: ${componentName}`, {
          frameDeltaMs: Math.round(frameDelta),
          frameBudgetMs,
        });
      }
      previous = now;
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [componentName, frameBudgetMs]);
}

export function scheduleIdleTask(task: () => void, timeout = 500): void {
  if (typeof window === "undefined") {
    task();
    return;
  }

  const withIdle = window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
  };

  if (typeof withIdle.requestIdleCallback === "function") {
    withIdle.requestIdleCallback(() => task(), { timeout });
    return;
  }

  setTimeout(task, 0);
}
