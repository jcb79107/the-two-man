import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "two-man-admin-session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const ADMIN_LOGIN_ATTEMPT_COOKIE_NAME = "two-man-admin-login-attempts";
const ADMIN_LOGIN_WINDOW_SECONDS = 60 * 15;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCKOUT_SECONDS = 60 * 15;

type AdminLoginAttemptState = {
  count: number;
  firstFailedAt: number;
  lockedUntil: number | null;
};

function getPreviewFallbackSecret() {
  if (process.env.VERCEL_ENV === "preview") {
    return "preview-admin-session-secret";
  }

  return "";
}

function getPreviewFallbackPassword() {
  if (process.env.VERCEL_ENV === "preview") {
    return "password";
  }

  return "";
}

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET || getPreviewFallbackSecret();
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || getPreviewFallbackPassword();
}

function signPayload(payload: string) {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
}

function buildSessionValue(issuedAt: number) {
  const payload = `admin:${issuedAt}`;
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function buildSignedValue(payload: string) {
  return `${payload}.${signPayload(payload)}`;
}

function verifySessionValue(value: string | undefined | null) {
  if (!value) {
    return false;
  }

  const lastDot = value.lastIndexOf(".");

  if (lastDot <= 0) {
    return false;
  }

  const payload = value.slice(0, lastDot);
  const receivedSignature = value.slice(lastDot + 1);
  const expectedSignature = signPayload(payload);

  try {
    if (
      !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const [scope, issuedAtRaw] = payload.split(":");

  if (scope !== "admin") {
    return false;
  }

  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt)) {
    return false;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  return ageSeconds >= 0 && ageSeconds <= ADMIN_SESSION_TTL_SECONDS;
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminPassword() && getAdminSecret());
}

export async function isAdminAuthenticated() {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  const store = await cookies();
  return verifySessionValue(store.get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdminSession() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("Admin session expired. Sign in again.");
  }
}

export async function createAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, buildSessionValue(Math.floor(Date.now() / 1000)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function adminPasswordMatches(candidate: string) {
  const expected = getAdminPassword();

  if (!expected) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  } catch {
    return false;
  }
}

function parseLoginAttemptState(value: string | undefined | null): AdminLoginAttemptState | null {
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

  const [scope, countRaw, firstFailedAtRaw, lockedUntilRaw] = payload.split(":");

  if (scope !== "login") {
    return null;
  }

  const count = Number(countRaw);
  const firstFailedAt = Number(firstFailedAtRaw);
  const lockedUntil = lockedUntilRaw === "none" ? null : Number(lockedUntilRaw);

  if (!Number.isFinite(count) || !Number.isFinite(firstFailedAt)) {
    return null;
  }

  if (lockedUntil !== null && !Number.isFinite(lockedUntil)) {
    return null;
  }

  return {
    count,
    firstFailedAt,
    lockedUntil
  };
}

function serializeLoginAttemptState(state: AdminLoginAttemptState) {
  return buildSignedValue(
    `login:${state.count}:${state.firstFailedAt}:${state.lockedUntil ?? "none"}`
  );
}

export async function assertAdminLoginAllowed() {
  const store = await cookies();
  const state = parseLoginAttemptState(store.get(ADMIN_LOGIN_ATTEMPT_COOKIE_NAME)?.value);

  if (!state?.lockedUntil) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  if (state.lockedUntil > now) {
    const retryMinutes = Math.max(1, Math.ceil((state.lockedUntil - now) / 60));
    throw new Error(`Too many admin login attempts. Try again in about ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`);
  }

  store.set(ADMIN_LOGIN_ATTEMPT_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function recordFailedAdminLogin() {
  const store = await cookies();
  const existing = parseLoginAttemptState(store.get(ADMIN_LOGIN_ATTEMPT_COOKIE_NAME)?.value);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - ADMIN_LOGIN_WINDOW_SECONDS;

  const current =
    existing && existing.firstFailedAt >= windowStart
      ? existing
      : { count: 0, firstFailedAt: now, lockedUntil: null };

  const nextCount = current.count + 1;
  const lockedUntil = nextCount >= ADMIN_LOGIN_MAX_ATTEMPTS ? now + ADMIN_LOGIN_LOCKOUT_SECONDS : null;

  store.set(
    ADMIN_LOGIN_ATTEMPT_COOKIE_NAME,
    serializeLoginAttemptState({
      count: nextCount,
      firstFailedAt: current.firstFailedAt,
      lockedUntil
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_LOGIN_LOCKOUT_SECONDS
    }
  );

  if (lockedUntil) {
    throw new Error("Too many admin login attempts. Try again later.");
  }
}

export async function clearAdminLoginAttempts() {
  const store = await cookies();
  store.set(ADMIN_LOGIN_ATTEMPT_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
