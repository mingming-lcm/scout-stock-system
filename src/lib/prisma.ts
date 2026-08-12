import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveSqliteUrl(url: string) {
  const filePath = url.startsWith("file:") ? url.slice("file:".length) : url;
  if (path.isAbsolute(filePath)) {
    return `file:${filePath}`;
  }

  const relative = filePath.replace(/^\.\//, "");
  const absolute = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    relative.startsWith("prisma/") ? relative : path.join("prisma", path.basename(relative)),
  );
  return `file:${absolute}`;
}

function createPrismaClient() {
  const url = resolveSqliteUrl(process.env.DATABASE_URL ?? "file:./prisma/dev.db");
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
