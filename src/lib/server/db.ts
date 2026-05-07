import { PrismaClient } from "@prisma/client";

declare global {
  var __fairwayPrisma__: PrismaClient | undefined;
}

function resolveDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL_UNPOOLED;

  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
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
