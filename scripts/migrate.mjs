import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
});

try {
  const migration = await readFile(
    path.join(process.cwd(), "db", "migrations", "001_initial.sql"),
    "utf8",
  );
  await sql.unsafe(migration);
  console.log("Database migration completed.");
} finally {
  await sql.end({ timeout: 5 });
}
