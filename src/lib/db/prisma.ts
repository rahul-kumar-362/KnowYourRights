import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton. Persistence is optional in the MVP slice — callers should
 * guard with hasDatabase() and treat write failures as non-fatal.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
