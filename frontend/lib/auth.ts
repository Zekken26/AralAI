/**
 * Token storage following the backend contract (tokens returned in JSON
 * bodies; no cookies). Access tokens live in memory only. The long-lived
 * refresh token lives in sessionStorage so a page reload within the tab keeps
 * the session, while closing the tab clears it. This is XSS-readable storage
 * by necessity (no httpOnly cookie support on the backend yet) — see README
 * "Known limitations".
 */
const REFRESH_TOKEN_KEY = "aralai.refresh";

let accessToken: string | null = null;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function setRefreshToken(token: string | null): void {
  const storage = getStorage();
  if (token === null) {
    storage?.removeItem(REFRESH_TOKEN_KEY);
  } else {
    storage?.setItem(REFRESH_TOKEN_KEY, token);
  }
}

export function setTokens(access: string, refresh: string): void {
  setAccessToken(access);
  setRefreshToken(refresh);
}

/** Remove both tokens. Returns true when a session actually existed. */
export function clearTokens(): boolean {
  const hadSession = accessToken !== null || getRefreshToken() !== null;
  accessToken = null;
  setRefreshToken(null);
  return hadSession;
}
