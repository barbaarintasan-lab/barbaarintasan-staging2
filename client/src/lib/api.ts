// API utility functions for admin operations

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any
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

export async function apiGet<T = any>(url: string): Promise<T> {
  return apiRequest<T>("GET", url);
}

export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  return apiRequest<T>("POST", url, data);
}

export async function apiPatch<T = any>(url: string, data: any): Promise<T> {
  return apiRequest<T>("PATCH", url, data);
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  return apiRequest<T>("DELETE", url);
}
