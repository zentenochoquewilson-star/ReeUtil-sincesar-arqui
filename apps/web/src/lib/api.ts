// apps/web/src/lib/api.ts
// Wrapper de fetch con base URL, Authorization por idToken y manejo robusto de errores.
// Exporta: get, post, put, patch, del

const API_BASE = String(
  ((import.meta as any)?.env?.VITE_API_BASE || "http://localhost:8080/api") as string
).replace(/\/$/, ""); // sin / al final

type JsonLike = Record<string, any> | any[] | null;
type ReqOpts = RequestInit & {
  expectText?: boolean;   // fuerza respuesta como texto
  timeoutMs?: number;     // timeout opcional
};

/** Une la base con el path, tolerando paths con o sin "/" inicial */
function joinUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Determina si el body es de tipo binario/form para NO fijar content-type JSON automáticamente */
function isSpecialBody(b: any) {
  return (
    b instanceof FormData ||
    b instanceof Blob ||
    b instanceof ArrayBuffer ||
    b instanceof URLSearchParams ||
    // @ts-ignore - streams opcionales según runtime
    (typeof ReadableStream !== "undefined" && b instanceof ReadableStream)
  );
}

/** Safe text para errores */
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}

/** Intenta parsear JSON; si falla, devuelve null */
function tryParseJSON<T = any>(s: string): T | null {
  try {
    return s ? (JSON.parse(s) as T) : (null as any);
  } catch {
    return null;
  }
}

/** request principal */
export async function request<T = any>(path: string, opts: ReqOpts = {}): Promise<T> {
  const token = localStorage.getItem("idToken") || "";
  const method = (opts.method || "GET").toUpperCase();

  // Headers (case-insensitive handled por fetch, pero normalizamos a string map)
  const headers = new Headers(opts.headers || {});
  // Authorization si hay token (permite override si el caller ya puso algo)
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  // Body y content-type inteligente:
  let bodyToSend: BodyInit | undefined = opts.body as any;
  const hasBody = bodyToSend !== undefined && method !== "GET" && method !== "HEAD";

  if (hasBody) {
    if (!isSpecialBody(bodyToSend)) {
      // Si es objeto/array/cosa serializable y NO se definió content-type, lo hacemos JSON
      const ctype = headers.get("content-type");
      if (!ctype) headers.set("content-type", "application/json");
      if (typeof bodyToSend !== "string") {
        bodyToSend = JSON.stringify(bodyToSend ?? {});
      }
    } else {
      // FormData / Blob / etc -> NO fijar content-type (lo hace el navegador)
      // bodyToSend se deja tal cual
    }
  } else {
    // Si no hay body o es GET/HEAD, aseguramos no enviar body accidentalmente
    bodyToSend = undefined;
  }

  // Soporte de timeout opcional
  const controller = new AbortController();
  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 15000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(joinUrl(path), {
      ...opts,
      method,
      headers,
      body: bodyToSend,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  // leemos como texto una sola vez
  const text = await safeText(res);
  const ctype = res.headers.get("content-type") || "";

  // si no OK -> construir error informativo
  if (!res.ok) {
    const payload = tryParseJSON<JsonLike>(text);
    const msg =
      (payload &&
        typeof payload === "object" &&
        ("error" in payload || "message" in payload) &&
        ((payload as any).error || (payload as any).message)) ||
      text ||
      `${res.status} ${res.statusText}`;
    const err = new Error(String(msg));
    (err as any).status = res.status;
    (err as any).payload = payload ?? text;
    throw err;
  }

  // OK -> devolver en el formato solicitado
  if (opts.expectText) return (text as unknown) as T;

  if (ctype.includes("application/json")) {
    // content-type JSON
    return (tryParseJSON<T>(text) as T);
  }

  // Si el servidor olvidó marcar content-type pero la respuesta es JSON válido, intentar parsear
  const maybe = tryParseJSON<T>(text);
  if (maybe !== null) return maybe;

  // Por defecto -> texto
  return (text as unknown) as T;
}

/* Helpers HTTP sencillos */
export function get<T = any>(path: string, init?: Omit<ReqOpts, "method">) {
  return request<T>(path, { ...(init || {}), method: "GET" });
}

export function post<T = any>(path: string, body?: any, init?: Omit<ReqOpts, "method" | "body">) {
  // Pasamos el body “raw”. request decidirá si JSON.stringify o no según el tipo
  return request<T>(path, { ...(init || {}), method: "POST", body });
}

export function put<T = any>(path: string, body?: any, init?: Omit<ReqOpts, "method" | "body">) {
  return request<T>(path, { ...(init || {}), method: "PUT", body });
}

export function patch<T = any>(path: string, body?: any, init?: Omit<ReqOpts, "method" | "body">) {
  return request<T>(path, { ...(init || {}), method: "PATCH", body });
}

export function del<T = any>(path: string, init?: Omit<ReqOpts, "method">) {
  return request<T>(path, { ...(init || {}), method: "DELETE" });
}
