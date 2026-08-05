import { apiRequest } from "@/lib/api-client";
import type { LoginRequest, RegisterRequest, TokenPair, User } from "@/types/auth";

const AUTH_BASE = "/auth";

export function loginRequest(payload: LoginRequest): Promise<TokenPair> {
  return apiRequest<TokenPair>({
    method: "POST",
    url: `${AUTH_BASE}/login/`,
    data: payload,
  });
}

export function registerRequest(payload: RegisterRequest): Promise<User> {
  return apiRequest<User>({
    method: "POST",
    url: `${AUTH_BASE}/register/`,
    data: payload,
  });
}

export function meRequest(signal?: AbortSignal): Promise<User> {
  return apiRequest<User>({
    method: "GET",
    url: `${AUTH_BASE}/me/`,
    signal,
  });
}

export function refreshRequest(refresh: string): Promise<TokenPair> {
  return apiRequest<TokenPair>({
    method: "POST",
    url: `${AUTH_BASE}/refresh/`,
    data: { refresh },
  });
}

export function logoutRequest(refresh: string): Promise<unknown> {
  return apiRequest({
    method: "POST",
    url: `${AUTH_BASE}/logout/`,
    data: { refresh },
  });
}
