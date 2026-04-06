import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "two-man-admin-session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

function signPayload(payload: string) {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
}

function buildSessionValue(issuedAt: number) {
  const payload = `admin:${issuedAt}`;
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
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
