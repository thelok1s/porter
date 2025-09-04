import { sequelize } from "@/lib/sequelize";

async function main() {
  await sequelize.drop();
  console.log("Complete");
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
