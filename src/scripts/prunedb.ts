import { sequelize } from "@/lib/sequelize";

async function main() {
  await sequelize.query("DROP TABLE IF EXISTS posts");
  await sequelize.query("DROP TABLE IF EXISTS replies");
  console.log("Complete");
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
