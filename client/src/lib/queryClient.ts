import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/** Redirect to /login when a 401 is detected (session expired). */
function handleUnauthorized() {
  // Only redirect if we're not already on the login page to avoid loops.
  if (!window.location.pathname.startsWith("/login")) {
    // Clear all stale cached data so the user doesn't see ghost data after re-login.
    queryClient.clear();
    window.location.href = "/login";
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    handleUnauthorized();
    // Still throw so callers (mutations) know it failed.
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // "throw" path — session expired; redirect to login.
      handleUnauthorized();
      throw new Error("401: Authentication required");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Invalidate all cached calendar event queries.
 * The calendar events query key includes query params (e.g. ?year=2025&month=1)
 * as part of the key string, so a simple queryKey prefix match won't work.
 * This helper uses a predicate to match any query containing the events path.
 */
export function invalidateCalendarEvents(qc: QueryClient) {
  qc.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].includes("/api/google-calendar/events"),
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
