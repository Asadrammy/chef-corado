import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating existing users with terms acceptance...');

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { termsAcceptedAt: null },
        { termsVersion: null },
        { acceptedVia: null },
      ],
    } as any,
    data: {
      termsAcceptedAt: new Date(),
      termsVersion: '2026-04',
      acceptedVia: 'register',
    } as any,
  });

  console.log(`✅ Updated ${result.count} users with terms acceptance`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
