import { sequelize } from "@/lib/sequelize";
import "./db/models";

async function boot() {
  await sequelize.sync({ alter: true });
}

boot().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
