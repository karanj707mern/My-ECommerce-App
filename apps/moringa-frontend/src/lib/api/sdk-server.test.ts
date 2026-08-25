import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@nestia/fetcher";
import {
  ApiError,
  ApiErrorKind,
  invokeSdk,
  isRemoteHttpError,
  toApiError,
} from "../api/sdk-server";

/**
 * Tests for the server-plane SDK seam (lib/api/sdk-server.ts).
 *
 * The pure logic — error taxonomy normalization, retry policy, timeout
 * classification — is exercised here without any network or NestJS runtime.
 * The connection-factory parts (createServerConnection) touch Headers/cookies
 * and are covered by the route-level smoke path instead.
 */

describe("toApiError", () => {
  it("passes an already-normalized ApiError through unchanged", () => {
    const original = new ApiError("timeout", "already normalized", 504);
    expect(toApiError(original)).toBe(original);
  });

  it("classifies a TimeoutError DOMException as a timeout", () => {
    const err = new DOMException("Timed out", "TimeoutError");
    const result = toApiError(err);
    expect(result.kind).toBe("timeout");
    expect(result.status).toBe(504);
  });

  it("classifies an AbortError DOMException as a timeout", () => {
    const err = new DOMException("Aborted", "AbortError");
    const result = toApiError(err);
    expect(result.kind).toBe("timeout");
    expect(result.status).toBe(499);
  });

  it("classifies a TypeError as a network error", () => {
    const err = new TypeError("fetch failed");
    const result = toApiError(err);
    expect(result.kind).toBe("network");
  });

  it("wraps an unknown Error as unknown", () => {
    const result = toApiError(new Error("something weird"));
    expect(result.kind).toBe("unknown");
    expect(result.message).toBe("something weird");
  });

  it("wraps a non-error value as unknown", () => {
    const result = toApiError("string thrown");
    expect(result.kind).toBe("unknown");
  });
});

describe("isRemoteHttpError", () => {
  it("is falsy for a plain Error", () => {
    expect(isRemoteHttpError(new Error("boom"))).toBe(false);
  });
});

describe("invokeSdk", () => {
  it("returns the resolved value on the first successful attempt", async () => {
    const call = vi.fn().mockResolvedValue({ ok: true });
    const result = await invokeSdk(call);
    expect(result).toEqual({ ok: true });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a non-idempotent failing call", async () => {
    const call = vi.fn().mockRejectedValue(new TypeError("network down"));
    await expect(invokeSdk(call)).rejects.toMatchObject({ kind: "network" });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries an idempotent call on transient network errors", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockRejectedValueOnce(new TypeError("still down"))
      .mockResolvedValue({ ok: true });

    const result = await invokeSdk(call, { idempotent: true, attempts: 3 });

    expect(result).toEqual({ ok: true });
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("stops retrying after a non-retryable HTTP error", async () => {
    // A 401 is an http-kind error below 500 -> not retryable.
    const httpError = new HttpError("GET", "/x", 401, {}, "unauthorized");
    const call = vi.fn().mockRejectedValue(httpError);

    await expect(invokeSdk(call, { idempotent: true, attempts: 3 })).rejects.toMatchObject({
      kind: "http",
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt budget is exhausted", async () => {
    const call = vi.fn().mockRejectedValue(new TypeError("persistent network failure"));

    await expect(invokeSdk(call, { idempotent: true, attempts: 3 })).rejects.toMatchObject({
      kind: "network",
    });
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("uses a default budget of 3 attempts for idempotent calls", async () => {
    const call = vi.fn().mockRejectedValue(new TypeError("fail"));
    await expect(invokeSdk(call, { idempotent: true })).rejects.toBeDefined();
    expect(call).toHaveBeenCalledTimes(3);
  });
});

describe("ApiError", () => {
  it("is an Error subclass with the right name and fields", () => {
    const err = new ApiError("http", "Not Found", 404, { message: "missing" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.kind).toBe("http" as ApiErrorKind);
    expect(err.status).toBe(404);
    expect(err.payload).toEqual({ message: "missing" });
  });

  it("defaults payload to null", () => {
    const err = new ApiError("network", "down");
    expect(err.payload).toBeNull();
  });
});
