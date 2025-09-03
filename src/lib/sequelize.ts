import { Sequelize } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "../../database/persistence.sqlite",
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
