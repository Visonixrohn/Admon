import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
import {
  mockStats,
  mockClients,
  mockRecentPayments,
  mockUpcomingPayments,
  mockMonthlyRevenue,
} from "./mockData";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;

    // Mock data routing (keep existing mocks)
    if (path === "/api/stats") return mockStats as any;
    if (path === "/api/clients") return mockClients as any;
    if (path === "/api/payments/recent") return mockRecentPayments as any;
    if (path === "/api/payments/upcoming") return mockUpcomingPayments as any;
    if (path === "/api/stats/revenue") return mockMonthlyRevenue as any;

    // If it's an API path, perform a real fetch to the server
    if (path.startsWith("/api/")) {
      const res = await fetch(path, { credentials: "include" });
      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") return null as any;
        throw new Error("401 Unauthorized");
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      // Try to parse JSON, fallback to text
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    }

    // No mock and not an API path — return null but warn
    console.warn(`No mock data found for path: ${path}`);
    return null;
  };

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
