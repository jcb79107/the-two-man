import { describe, expect, it } from "vitest";
import {
  assertProductionDatabaseEnv,
  ProductionDatabaseTargetError,
  redactDatabaseUrl,
  shouldValidateProductionDatabaseEnv,
  validateProductionDatabaseEnv
} from "@/lib/server/production-db-guardrail";

const canonicalUrl =
  "postgresql://app_user:super-secret-password@ep-rapid-poetry-ap42mylu-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";

describe("production database guardrail", () => {
  it("skips local and test environments unless validation is explicitly enabled", () => {
    const result = validateProductionDatabaseEnv({
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://neondb_owner:secret@ep-soft-cell-an49z71n-pooler.c-6.us-east-1.aws.neon.tech/neondb"
    });

    expect(result).toEqual({ checked: false, failures: [] });
  });

  it("treats Vercel production and explicit opt-in as production-like", () => {
    expect(shouldValidateProductionDatabaseEnv({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldValidateProductionDatabaseEnv({ THE_TWO_MAN_VALIDATE_PROD_DB: "1" })).toBe(true);
    expect(shouldValidateProductionDatabaseEnv({ APP_ENV: "production" })).toBe(true);
  });

  it("accepts the canonical live Neon endpoint and host", () => {
    const result = validateProductionDatabaseEnv({
      VERCEL_ENV: "production",
      DATABASE_URL: canonicalUrl
    });

    expect(result.checked).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("rejects stale Neon endpoint, stale host, and owner role without exposing the URL", () => {
    const staleUrl =
      "postgresql://neondb_owner:super-secret-password@ep-soft-cell-an49z71n-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

    expect(() =>
      assertProductionDatabaseEnv({
        VERCEL_ENV: "production",
        DATABASE_URL: staleUrl
      })
    ).toThrow(ProductionDatabaseTargetError);

    try {
      assertProductionDatabaseEnv({
        VERCEL_ENV: "production",
        DATABASE_URL: staleUrl
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ProductionDatabaseTargetError);
      expect(String(error)).not.toContain("super-secret-password");
      expect(String(error)).not.toContain(staleUrl);
      expect(String(error)).toContain("forbidden production database marker");
      expect((error as ProductionDatabaseTargetError).failures.map((failure) => failure.marker)).toEqual(
        expect.arrayContaining(["ep-soft-cell", "ep-soft-cell-an49z71n", "c-6.us-east-1.aws.neon.tech", "neondb_owner"])
      );
    }
  });

  it("rejects production DB URLs that do not point at the canonical endpoint and host", () => {
    const result = validateProductionDatabaseEnv({
      VERCEL_ENV: "production",
      DATABASE_URL:
        "postgresql://app_user:super-secret-password@ep-other-branch-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
    });

    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["missing_expected_endpoint", "missing_expected_host"])
    );
  });

  it("redacts passwords and query strings from diagnostic URL formatting", () => {
    expect(redactDatabaseUrl(canonicalUrl)).toBe(
      "postgresql://<user>:<redacted>@ep-rapid-poetry-ap42mylu-pooler.c-7.us-east-1.aws.neon.tech/neondb?<redacted>"
    );
  });
});
