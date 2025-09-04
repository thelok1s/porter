import dotenv from "dotenv";
import {
  initDatabase,
  closeDatabase,
  sequelize,
  DB_FILE,
} from "@/lib/sequelize";

dotenv.config();

async function main() {
  try {
    await initDatabase();
    const dbFile = DB_FILE;
    console.log(`Using SQLite file: ${dbFile}`);
    console.log("Database initialized and tables are ready.");
    const [results, meta] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table';",
    );
    console.log(
      `Tables: ${(results as Array<{ name: string }>).map((table) => table.name).join(", ")}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to initialize database:", msg);
    process.exitCode = 1;
  } finally {
    await closeDatabase().catch(() => void 0);
  }
}

main();
