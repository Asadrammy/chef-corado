import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.user.findUnique({
    where: { email: 'client@example.com' },
    select: {
      email: true,
      termsAcceptedAt: true,
      termsVersion: true,
      acceptedVia: true,
    },
  });

  console.log('Client user terms status:', client);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
