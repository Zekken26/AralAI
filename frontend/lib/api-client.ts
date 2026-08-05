import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { getAccessToken, setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from "@/lib/auth";
import type { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";

/**
 * Reusable axios client for the AralAI backend.
 *
 * Responsibilities:
 * - JSON headers + Bearer access token attachment.
 * - 401 handling: one shared refresh attempt (deduplicated across concurrent
 *   failures), then a single retry of the original request.
 * - Never refreshes the refresh request itself and never retries twice.
 * - Clears the session when the refresh fails and notifies listeners so the
 *   app can redirect to /login.
 * - Normalizes backend errors into ApiError.
 * - Supports per-request cancellation via AbortSignal.
 */

/** Browser event fired when the refresh attempt failed and the session is gone. */
export const SESSION_EXPIRED_EVENT = "aralai:session-expired";

const REFRESH_PATH = "/auth/refresh/";

type RefreshResponse = { access: string; refresh: string };

let refreshPromise: Promise<boolean> | null = null;

function normalizeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const maybe = data as Record<string, unknown>;
    if (typeof maybe.detail === "string") {
      return maybe.detail;
    }
  }
  return fallback;
}

function normalizeError(error: unknown): ApiError {
  if (axios.isCancel(error)) {
    return { code: "CANCELLED", message: "Request cancelled." };
  }
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.code === "ECONNABORTED") {
      return {
        code: "TIMEOUT",
        message: "The server took too long to respond. Please try again.",
        status: axiosError.response?.status,
      };
    }
    if (!axiosError.response) {
      return {
        code: "NETWORK_ERROR",
        message: "Cannot reach the server. Check your connection and try again.",
      };
    }
    const { status, data } = axiosError.response;
    const body = data as Record<string, unknown> | undefined;
    if (status === 401) {
      const message =
        typeof body?.detail === "string" && body.detail.length > 0
          ? body.detail
          : "Your session has expired. Please sign in again.";
      return {
        code: "UNAUTHORIZED",
        message,
        status,
      };
    }
    if (typeof body?.detail === "string") {
      return {
        code: typeof body.code === "string" ? body.code : "REQUEST_FAILED",
        message: body.detail,
        status,
      };
    }
    if (body && typeof body === "object") {
      const fields: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(body)) {
        if (key === "code") {
          continue;
        }
        if (Array.isArray(value)) {
          fields[key] = value.map(String);
        } else if (typeof value === "string") {
          fields[key] = [value];
        }
      }
      const firstMessage = Object.values(fields).flat()[0];
      return {
        code: typeof body.code === "string" ? body.code : "VALIDATION_ERROR",
        message: firstMessage ?? "The submitted data was not accepted.",
        fields,
        status,
      };
    }
    return { code: "REQUEST_FAILED", message: "Something went wrong. Please try again.", status };
  }
  return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifySessionExpired(): void {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

/** Refresh the access token. Shared across callers; never called for the refresh endpoint itself. */
function refreshTokens(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) {
      return false;
    }
    try {
      const response = await rawAxios.post<RefreshResponse>(REFRESH_PATH, { refresh });
      setAccessToken(response.data.access);
      // The backend rotates refresh tokens: the old one is blacklisted, so
      // the newly issued refresh token must be stored or the next refresh
      // (and logout) will fail.
      setRefreshToken(response.data.refresh);
      return true;
    } catch {
      clearTokens();
      notifySessionExpired();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

const rawAxios = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15_000,
});

rawAxios.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

rawAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isRefreshRequest = config?.url?.includes(REFRESH_PATH);
    const isUnauthorized = error.response?.status === 401;
    const canRetry =
      config && !config._retry && isUnauthorized && !isRefreshRequest && getRefreshToken() !== null;

    if (!canRetry) {
      if (isUnauthorized && !isRefreshRequest) {
        // Only announce the lost session when one actually existed — the
        // anonymous startup /auth/me/ probe must not wipe cached queries.
        const hadSession = clearTokens();
        if (hadSession) {
          notifySessionExpired();
        }
      }
      return Promise.reject(normalizeError(error));
    }

    config._retry = true;
    const refreshed = await refreshTokens();
    if (!refreshed) {
      return Promise.reject(normalizeError(error));
    }
    const token = getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return rawAxios(config);
  },
);

export const apiClient: AxiosInstance = rawAxios;

/** Type-safe request helper. Pass an AbortSignal for cancellation. */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}

export { normalizeError, normalizeErrorMessage };
export type { AxiosHeaders };
