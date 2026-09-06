import { PrismaClient } from "@prisma/client";

// Patrón estándar de Next.js para evitar abrir una nueva conexión a la
// base de datos en cada hot-reload durante desarrollo.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
