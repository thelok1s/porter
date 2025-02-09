import { Database } from "bun:sqlite";
import logger from "./logger";

export const db = new Database("./src/lib/persistence.sqlite");

export function initDatabase() {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY,
        vk_id INTEGER,
        vk_owner_id INTEGER,
        tg_id INTEGER,
        discussion_tg_id INTEGER,
        tg_author_id TEXT,
        created_at TIMESTAMP,
        text TEXT,
        text_hash TEXT,
        attachments TEXT,
        UNIQUE(vk_id, tg_id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY,
        state TEXT,
        vk_id INTEGER,
        vk_owner_id INTEGER,
        tg_id INTEGER,
        tg_author_id INTEGER,
        created_at TIMESTAMP,
        text TEXT,
        text_hash TEXT,
        attachments TEXT
      )
    `);
  } catch (error) {
    logger.fatal("Database initialization failed:", error);
    process.exit(1);
  }
}
