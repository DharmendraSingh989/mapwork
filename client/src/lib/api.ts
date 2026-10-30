const API_BASE = "/api/v1";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, ...rest } = options;

  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>)
  };

  const storedToken = token || localStorage.getItem("mapforge_access_token");
  if (storedToken) {
    authHeaders["Authorization"] = `Bearer ${storedToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...rest,
    headers: authHeaders
  });

  const contentType = res.headers.get("content-type");
  let data: any = null;
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.error || res.statusText || "Request failed";
    throw new Error(errorMsg);
  }

  return data as T;
}
