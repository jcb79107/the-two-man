import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

type ThrottleOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
  message: string;
};

type ThrottleState = {
  count: number;
  startedAt: number;
};

function getThrottleSecret() {
  return process.env.ADMIN_SESSION_SECRET || "two-man-throttle-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", getThrottleSecret()).update(payload).digest("hex");
}

function getCookieName(key: string) {
  return `two-man-throttle-${key}`;
}

function parseState(value: string | undefined | null, key: string): ThrottleState | null {
  if (!value) {
    return null;
  }

  const lastDot = value.lastIndexOf(".");

  if (lastDot <= 0) {
    return null;
  }

  const payload = value.slice(0, lastDot);
  const receivedSignature = value.slice(lastDot + 1);
  const expectedSignature = signPayload(payload);

  try {
    if (!timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  const [scope, countRaw, startedAtRaw] = payload.split(":");

  if (scope !== key) {
    return null;
  }

  const count = Number(countRaw);
  const startedAt = Number(startedAtRaw);

  if (!Number.isFinite(count) || !Number.isFinite(startedAt)) {
    return null;
  }

  return { count, startedAt };
}

function serializeState(key: string, state: ThrottleState) {
  const payload = `${key}:${state.count}:${state.startedAt}`;
  return `${payload}.${signPayload(payload)}`;
}

export async function assertRequestAllowed({ key, limit, windowSeconds, message }: ThrottleOptions) {
  const now = Math.floor(Date.now() / 1000);
  const store = await cookies();
  const cookieName = getCookieName(key);
  const existing = parseState(store.get(cookieName)?.value, key);

  const state =
    existing && now - existing.startedAt < windowSeconds
      ? existing
      : { count: 0, startedAt: now };

  const nextState = {
    count: state.count + 1,
    startedAt: state.startedAt
  };

  store.set(cookieName, serializeState(key, nextState), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: windowSeconds
  });

  if (nextState.count > limit) {
    throw new Error(message);
  }
}
