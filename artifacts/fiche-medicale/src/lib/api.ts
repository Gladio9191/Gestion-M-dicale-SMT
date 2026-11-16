import { getOwnerCsrfToken } from "./owner-session";

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

if (configuredApiBaseUrl) {
  let parsedApiBaseUrl: URL;
  try {
    parsedApiBaseUrl = new URL(configuredApiBaseUrl);
  } catch {
    throw new Error(
      "VITE_API_BASE_URL must be an absolute HTTP(S) URL when provided.",
    );
  }

  if (parsedApiBaseUrl.protocol !== "http:" && parsedApiBaseUrl.protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS.");
  }
}

export const API_BASE_URL = configuredApiBaseUrl;

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  const csrf = getOwnerCsrfToken();
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrf) headers.set("X-SMT-CSRF", csrf);
  return fetch(apiUrl(path), { ...init, headers, credentials: init?.credentials ?? "include" });
}
