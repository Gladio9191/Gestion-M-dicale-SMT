let csrfToken: string | null = null;

export function setOwnerCsrfToken(value: string | null): void {
  csrfToken = value;
}

export function getOwnerCsrfToken(): string | null {
  return csrfToken;
}

export function ownerCsrfHeaders(method: string): Record<string, string> {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()) || !csrfToken) return {};
  return { "X-SMT-CSRF": csrfToken };
}
