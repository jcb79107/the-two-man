import { PrismaClient } from "@prisma/client";

declare global {
  var __fairwayPrisma__: PrismaClient | undefined;
}

export const db =
  globalThis.__fairwayPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__fairwayPrisma__ = db;
}
