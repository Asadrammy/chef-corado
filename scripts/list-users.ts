import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      termsAcceptedAt: true,
      termsVersion: true,
      acceptedVia: true,
    } as any,
    take: 10,
  });

  console.log('Users in database:');
  users.forEach(u => {
    console.log(`- ${u.email} (${u.role}): termsAcceptedAt=${u.termsAcceptedAt}, termsVersion=${u.termsVersion}, acceptedVia=${u.acceptedVia}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
