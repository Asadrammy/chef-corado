import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearSessions() {
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  console.log('✅ Cleared all sessions, accounts, and verification tokens');
}

clearSessions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
