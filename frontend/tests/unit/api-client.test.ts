import { AxiosError } from "axios";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";

import { apiClient, normalizeError, SESSION_EXPIRED_EVENT } from "@/lib/api-client";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth";

describe("api client", () => {
  let mock: MockAdapter;
  let refreshCount = 0;

  beforeAll(() => {
    mock = new MockAdapter(apiClient);
  });

  beforeEach(() => {
    mock.reset();
    clearTokens();
    refreshCount = 0;
  });

  afterAll(() => {
    mock.restore();
  });

  it("attaches the Bearer access token to requests", async () => {
    setTokens("access-token-1", "refresh-token-1");
    let authHeader: string | undefined;
    mock.onGet("/auth/me/").reply((config) => {
      authHeader = String(config.headers?.Authorization);
      return [200, { id: 1 }];
    });
    await apiClient.get("/auth/me/");
    expect(authHeader).toBe("Bearer access-token-1");
  });

  it("triggers exactly one refresh on a 401 and retries the request", async () => {
    setTokens("access-token-1", "refresh-token-1");
    mock
      .onPost("/auth/refresh/")
      .replyOnce(200, { access: "access-token-2", refresh: "refresh-token-2" });
    mock.onGet("/auth/me/").replyOnce(401, { detail: "expired" }).onGet("/auth/me/").reply(200, { id: 1 });

    const response = await apiClient.get("/auth/me/");
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ id: 1 });
    expect(getRefreshToken()).toBe("refresh-token-2");
  });

  it("retries only once — a second 401 is not followed by another refresh", async () => {
    setTokens("access-token-1", "refresh-token-1");
    mock.onPost("/auth/refresh/").reply(200, { access: "access-token-2", refresh: "refresh-token-2" });
    mock.onGet("/auth/me/").reply(401, { detail: "nope" });

    await expect(apiClient.get("/auth/me/")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const refreshCalls = mock.history.post.filter((r) => r.url === "/auth/refresh/");
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears the session when the refresh fails and notifies listeners", async () => {
    setTokens("access-token-1", "refresh-token-1");
    mock.onPost("/auth/refresh/").reply(401, { detail: "token not valid" });
    mock.onGet("/auth/me/").reply(401, { detail: "expired" });

    let expiredFired = 0;
    const listener = () => {
      expiredFired += 1;
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(apiClient.get("/auth/me/")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getRefreshToken()).toBeNull();
    expect(expiredFired).toBeGreaterThanOrEqual(1);

    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("shares a single refresh across concurrent 401 responses", async () => {
    setTokens("access-token-1", "refresh-token-1");
    let meCalls = 0;
    mock.onGet("/auth/me/").reply(() => {
      meCalls += 1;
      return meCalls <= 3 ? [401, { detail: "expired" }] : [200, { id: 1 }];
    });
    mock.onPost("/auth/refresh/").reply(() => {
      refreshCount += 1;
      return [200, { access: "access-token-2", refresh: "refresh-token-2" }];
    });

    await Promise.all([apiClient.get("/auth/me/"), apiClient.get("/auth/me/"), apiClient.get("/auth/me/")]);
    expect(refreshCount).toBe(1);
  });

  it("does not try to refresh the refresh endpoint itself", async () => {
    setTokens("access-token-1", "refresh-token-1");
    mock.onPost("/auth/refresh/").reply(() => {
      refreshCount += 1;
      return [401, { detail: "token not valid" }];
    });

    await expect(apiClient.post("/auth/refresh/", { refresh: "refresh-token-1" })).rejects.toBeTruthy();
    expect(refreshCount).toBe(1);
  });

  it("normalizes a network failure into NETWORK_ERROR", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK");
    expect(normalizeError(error)).toMatchObject({
      code: "NETWORK_ERROR",
      message: "Cannot reach the server. Check your connection and try again.",
    });
  });

  it("normalizes a DRF validation error with field messages", async () => {
    mock.onPost("/auth/register/").reply(400, {
      email: ["A user with this email already exists."],
      code: "invalid",
    });
    await expect(
      apiClient.post("/auth/register/", { email: "dup@example.com" }),
    ).rejects.toMatchObject({
      code: "invalid",
      fields: { email: ["A user with this email already exists."] },
    });
  });

  it("normalizes a generic detail error", async () => {
    mock.onPost("/auth/login/").reply(401, {
      detail: "No active account found with the given credentials",
      code: "authentication_failed",
    });
    await expect(
      apiClient.post("/auth/login/", { email: "a@b.co", password: "x" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});