import { PrismaClient } from "@prisma/client";

declare global {
  var __fairwayPrisma__: PrismaClient | undefined;
}

function resolveDatabaseUrl() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL;

  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname === "ep-soft-cell-an49z71n-pooler.c-6.us-east-1.aws.neon.tech" ||
      parsed.hostname === "ep-soft-cell-an49z71n.c-6.us-east-1.aws.neon.tech"
    ) {
      parsed.hostname = "ep-soft-cell-an49z71n-ddq.c-6.us-east-1.aws.neon.tech";
    }

    parsed.searchParams.set("connect_timeout", "30");
    return parsed.toString();
  } catch {
    return url;
  }
}

const databaseUrl = resolveDatabaseUrl();

export const db =
  globalThis.__fairwayPrisma__ ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__fairwayPrisma__ = db;
}
