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

export function openSSOLink() {
  const newWindow = window.open("about:blank", "_blank");

  fetch("/api/user", { credentials: "include" })
    .then(res => res.ok ? res.json() : null)
    .then(user => {
      const params = new URLSearchParams();
      if (user?.fullName) params.set("name", user.fullName);
      if (user?.email) params.set("email", user.email);
      params.set("from", "app");
      const url = `https://barbaarintasan.com/koorso-iibso/?${params.toString()}`;
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    })
    .catch(() => {
      const url = "https://barbaarintasan.com/koorso-iibso/?from=app";
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    });
}
