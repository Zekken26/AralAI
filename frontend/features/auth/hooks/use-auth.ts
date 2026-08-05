import { useCallback, useEffect, useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SESSION_EXPIRED_EVENT } from "@/lib/api-client";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import type { ApiError } from "@/lib/errors";
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
} from "@/features/auth/api/auth.api";
import type { LoginRequest, RegisterRequest, User, UserRole } from "@/types/auth";

export const CURRENT_USER_KEY = "currentUser" as const;

export function dashboardRouteForRole(role: UserRole): string {
  switch (role) {
    case "STUDENT":
      return ROUTES.studentDashboard;
    case "TEACHER":
      return ROUTES.teacherDashboard;
    default:
      return ROUTES.unauthorized;
  }
}

/**
 * Authentication state backed by TanStack Query. The current user is server
 * state; no global auth store is needed. The provider below blocks rendering
 * until the startup /auth/me/ request settles so protected content never
 * flashes before authentication is known.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: [CURRENT_USER_KEY],
    queryFn: ({ signal }) => meRequest(signal),
    retry: false,
    staleTime: 60_000,
  });

  const user: User | undefined = meQuery.data;
  const isLoading = meQuery.isPending;
  const error = (meQuery.error as unknown) as ApiError | undefined;

  const refetchUser = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: [CURRENT_USER_KEY] });
  }, [queryClient]);

  /** User object after invalidation resolves, or undefined. */
  const currentUserAfterRefresh = useCallback(() => {
    const data = queryClient.getQueryData<User>([CURRENT_USER_KEY]);
    return data ?? undefined;
  }, [queryClient]);

  const login = useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const tokens = await loginRequest(payload);
      setTokens(tokens.access, tokens.refresh);
      await refetchUser();
      return currentUserAfterRefresh();
    },
  });

  const register = useMutation({
    mutationFn: async (payload: RegisterRequest) => {
      await registerRequest(payload);
      // Registration does not issue tokens; sign the user in automatically
      // with the same credentials so they land on their dashboard.
      const tokens = await loginRequest({
        email: payload.email,
        password: payload.password,
      });
      setTokens(tokens.access, tokens.refresh);
      await refetchUser();
      return currentUserAfterRefresh();
    },
  });

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await logoutRequest(refresh);
      } catch {
        // Backend logout is best-effort; the local session must be cleared
        // even when the network is unavailable.
      }
    }
    clearTokens();
    queryClient.setQueryData([CURRENT_USER_KEY], undefined);
    queryClient.clear();
  }, [queryClient]);

  // When the refresh attempt fails, the api client fires SESSION_EXPIRED_EVENT.
  // Clear cached user data so guards redirect to /login.
  useEffect(() => {
    const onSessionExpired = () => {
      queryClient.setQueryData([CURRENT_USER_KEY], undefined);
      queryClient.clear();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [queryClient]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      login: login.mutateAsync,
      register: register.mutateAsync,
      logout,
      refetchUser,
      isLoggingIn: login.isPending,
      isRegistering: register.isPending,
    }),
    [
      user,
      isLoading,
      error,
      login.mutateAsync,
      register.mutateAsync,
      logout,
      refetchUser,
      login.isPending,
      register.isPending,
    ],
  );
}

export type UseAuth = ReturnType<typeof useAuth>;