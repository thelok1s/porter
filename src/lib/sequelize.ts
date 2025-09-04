import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";

export const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.resolve("./src/db/persistence.sqlite");

// Ensure the directory for the SQLite file exists
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_FILE,
  logging: false,
});

export async function assertConnection() {
  await sequelize.authenticate();
}

export async function initDatabase(): Promise<void> {
  await assertConnection();

  await Promise.all([
    import("../models/post.schema"),
    import("../models/reply.schema"),
    import("../models/user.schema"),
  ]);

  // Enable FK enforcement (SQLite)
  await sequelize.query("PRAGMA foreign_keys = ON");
  await sequelize.sync();
}

export async function closeDatabase(): Promise<void> {
  await sequelize.close();
}
