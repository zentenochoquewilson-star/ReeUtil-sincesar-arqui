// apps/web/src/lib/api.ts
// Pequeño wrapper para fetch con base URL y encabezado Authorization.
// Exporta: get, post, put, patch, del

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8080/api").replace(/\/$/, "");

type Json = Record<string, any> | Array<any> | null;

function joinUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("idToken") || "";
  const headers = new Headers(init.headers || {});

  // Solo ponemos content-type JSON cuando hay body
  const hasBody = init.body !== undefined && init.method && init.method !== "GET";
  if (hasBody && !headers.has("content-type")) headers.set("content-type", "application/json");

  // Authorization si hay token
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(joinUrl(path), { ...init, headers });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: Json = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Si no es JSON, devolvemos el texto como está
    (data as any) = text;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && ("error" in data || "message" in data) && ((data as any).error || (data as any).message)) ||
      `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).payload = data;
    throw err;
  }

  return data as T;
}

export const get = <T = any>(path: string, init?: RequestInit) =>
  request<T>(path, { ...(init || {}), method: "GET" });

export const post = <T = any>(path: string, body?: any, init?: RequestInit) =>
  request<T>(path, {
    ...(init || {}),
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const put = <T = any>(path: string, body?: any, init?: RequestInit) =>
  request<T>(path, {
    ...(init || {}),
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const patch = <T = any>(path: string, body?: any, init?: RequestInit) =>
  request<T>(path, {
    ...(init || {}),
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const del = <T = any>(path: string, init?: RequestInit) =>
  request<T>(path, { ...(init || {}), method: "DELETE" });
