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
      `Tables: ${results.map((table: any) => table.name).join(", ")}`,
    );
  } catch (err: any) {
    console.error("Failed to initialize database:", err?.message ?? err);
    process.exitCode = 1;
  } finally {
    await closeDatabase().catch(() => void 0);
  }
}

main();
