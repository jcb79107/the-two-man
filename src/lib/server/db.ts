import { PrismaClient } from "@prisma/client";

declare global {
  var __fairwayPrisma__: PrismaClient | undefined;
}

const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL;

export const db =
  globalThis.__fairwayPrisma__ ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__fairwayPrisma__ = db;
}
