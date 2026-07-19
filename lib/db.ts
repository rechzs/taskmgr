import postgres from "postgres";

const globalForDb = globalThis as typeof globalThis & {
  taskmgrSql?: ReturnType<typeof postgres>;
};

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForDb.taskmgrSql) {
    globalForDb.taskmgrSql = postgres(databaseUrl, {
      max: 5,
      connect_timeout: 10,
      idle_timeout: 20,
      prepare: false,
    });
  }

  return globalForDb.taskmgrSql;
}
