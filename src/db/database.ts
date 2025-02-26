import { Database } from "bun:sqlite";
const db = new Database("./src/db/persistence.sqlite");

db.run(`
    CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    vk_id INTEGER UNIQUE NOT NULL,
    vk_owner_id INTEGER,
    tg_id INTEGER UNIQUE NOT NULL,
    discussion_tg_id INTEGER UNIQUE,
    tg_author_id TEXT,
    created_at TIMESTAMP,
    text_hash TEXT,
    attachments TEXT
)`);

db.run(`
    CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY,
    vk_post_id INTEGER REFERENCES posts(vk_id),
    vk_reply_id INTEGER UNIQUE,
    vk_owner_id INTEGER,
    tg_reply_id INTEGER UNIQUE,
    discussion_tg_id INTEGER REFERENCES posts(discussion_tg_id),
    tg_author_id INTEGER,
    created_at TIMESTAMP,
    text_hash TEXT DEFAULT NULL,
    attachments TEXT
)`);

db.run("CREATE INDEX IF NOT EXISTS idx_posts_vk_id ON posts(vk_id)");
db.run("CREATE INDEX IF NOT EXISTS idx_posts_tg_id ON posts(tg_id)");
db.run("CREATE INDEX IF NOT EXISTS idx_replies_vk_id ON replies(vk_post_id)");

export { db };
