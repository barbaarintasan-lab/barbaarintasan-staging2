// API utility functions for admin operations

export async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  };

  const res = await fetch(url, options);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export async function apiGet<T>(url: string): Promise<T> {
  return apiRequest<T>("GET", url);
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  return apiRequest<T>("POST", url, data);
}

export async function apiPatch<T>(url: string, data: unknown): Promise<T> {
  return apiRequest<T>("PATCH", url, data);
}

export async function apiDelete<T>(url: string): Promise<T> {
  return apiRequest<T>("DELETE", url);
}
