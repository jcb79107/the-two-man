const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED"
] as const;

export const THE_TWO_MAN_PRODUCTION_DB_TARGET = {
  neonProject: "gentle-cake-18017138 / neon-cinereous-planet",
  neonBranch: "br-noisy-poetry-apwbzdlv",
  endpoint: "ep-rapid-poetry-ap42mylu",
  hostSuffix: "c-7.us-east-1.aws.neon.tech",
  forbiddenMarkers: [
    "ep-soft-cell",
    "ep-soft-cell-an49z71n",
    "c-6.us-east-1.aws.neon.tech",
    "neondb_owner"
  ]
} as const;

export type DatabaseEnvKey = (typeof DATABASE_ENV_KEYS)[number];

type ProductionDatabaseGuardrailEnv = Record<string, string | undefined>;

export type ProductionDatabaseGuardrailFailure = {
  key: DatabaseEnvKey | "DATABASE_ENV";
  code:
    | "missing_database_url"
    | "forbidden_marker"
    | "missing_expected_endpoint"
    | "missing_expected_host";
  message: string;
  marker?: string;
};

export type ProductionDatabaseGuardrailResult = {
  checked: boolean;
  failures: ProductionDatabaseGuardrailFailure[];
};

type GuardrailOptions = {
  force?: boolean;
  logger?: Pick<Console, "error">;
};

export class ProductionDatabaseTargetError extends Error {
  readonly failures: ProductionDatabaseGuardrailFailure[];

  constructor(message: string, failures: ProductionDatabaseGuardrailFailure[]) {
    super(message);
    this.name = "ProductionDatabaseTargetError";
    this.failures = failures;
  }
}

function isTruthy(value: string | undefined) {
  return value === "1" || value === "true" || value === "yes";
}

function isProductionLabel(value: string | undefined) {
  return value === "production" || value === "prod" || value === "live";
}

export function shouldValidateProductionDatabaseEnv(env: ProductionDatabaseGuardrailEnv) {
  if (isTruthy(env.THE_TWO_MAN_VALIDATE_PROD_DB)) {
    return true;
  }

  if (env.VERCEL_ENV === "production") {
    return true;
  }

  if (isProductionLabel(env.THE_TWO_MAN_ENV) || isProductionLabel(env.APP_ENV)) {
    return true;
  }

  return false;
}

function getConfiguredDatabaseEnvValues(env: ProductionDatabaseGuardrailEnv) {
  return DATABASE_ENV_KEYS.flatMap((key) => {
    const value = env[key];
    return value ? [{ key, value }] : [];
  });
}

function inspectDatabaseValue(
  key: DatabaseEnvKey,
  value: string
): ProductionDatabaseGuardrailFailure[] {
  const lowerValue = value.toLowerCase();
  const failures: ProductionDatabaseGuardrailFailure[] = [];

  for (const marker of THE_TWO_MAN_PRODUCTION_DB_TARGET.forbiddenMarkers) {
    if (lowerValue.includes(marker.toLowerCase())) {
      failures.push({
        key,
        code: "forbidden_marker",
        marker,
        message: `${key} contains forbidden production database marker ${marker}.`
      });
    }
  }

  if (!lowerValue.includes(THE_TWO_MAN_PRODUCTION_DB_TARGET.endpoint.toLowerCase())) {
    failures.push({
      key,
      code: "missing_expected_endpoint",
      message: `${key} does not point at the canonical The Two Man Neon endpoint.`
    });
  }

  if (!lowerValue.includes(THE_TWO_MAN_PRODUCTION_DB_TARGET.hostSuffix.toLowerCase())) {
    failures.push({
      key,
      code: "missing_expected_host",
      message: `${key} does not point at the canonical The Two Man Neon host.`
    });
  }

  return failures;
}

export function validateProductionDatabaseEnv(
  env: ProductionDatabaseGuardrailEnv = process.env,
  options: Pick<GuardrailOptions, "force"> = {}
): ProductionDatabaseGuardrailResult {
  if (!options.force && !shouldValidateProductionDatabaseEnv(env)) {
    return { checked: false, failures: [] };
  }

  const configuredDatabaseValues = getConfiguredDatabaseEnvValues(env);

  if (configuredDatabaseValues.length === 0) {
    return {
      checked: true,
      failures: [
        {
          key: "DATABASE_ENV",
          code: "missing_database_url",
          message: "No database URL environment variable is configured for production."
        }
      ]
    };
  }

  return {
    checked: true,
    failures: configuredDatabaseValues.flatMap(({ key, value }) => inspectDatabaseValue(key, value))
  };
}

export function formatProductionDatabaseGuardrailFailure(
  failures: ProductionDatabaseGuardrailFailure[]
) {
  const details = failures.map((failure) => failure.message).join(" ");

  return [
    "CRITICAL: The Two Man production database guardrail failed.",
    details,
    `Expected endpoint ${THE_TWO_MAN_PRODUCTION_DB_TARGET.endpoint} on ${THE_TWO_MAN_PRODUCTION_DB_TARGET.hostSuffix}.`,
    "Database URLs and credentials were redacted."
  ].join(" ");
}

export function assertProductionDatabaseEnv(
  env: ProductionDatabaseGuardrailEnv = process.env,
  options: GuardrailOptions = {}
) {
  const result = validateProductionDatabaseEnv(env, options);

  if (result.failures.length === 0) {
    return result;
  }

  const message = formatProductionDatabaseGuardrailFailure(result.failures);
  options.logger?.error(message);
  throw new ProductionDatabaseTargetError(message, result.failures);
}

export function redactDatabaseUrl(value: string) {
  try {
    const parsed = new URL(value);
    const auth = parsed.username || parsed.password ? "<user>:<redacted>@" : "";
    const query = parsed.search ? "?<redacted>" : "";
    return `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}${query}`;
  } catch {
    return "<redacted database url>";
  }
}
