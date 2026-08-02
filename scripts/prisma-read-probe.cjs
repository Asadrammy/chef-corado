const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

(async () => {
  console.log("Prisma read probe starting");
  console.log("User count=" + await prisma.user.count());
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error("Prisma read probe FAILED");
  console.error(error);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
