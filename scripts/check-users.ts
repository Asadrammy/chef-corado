import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('👥 Checking users in database...\n');

  const users = await prisma.user.findMany({
    where: { role: 'CHEF' },
    include: { chefProfile: true }
  });

  console.log(`Found ${users.length} chef users:`);
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) - Profile ID: ${user.chefProfile?.id || 'None'}`);
  });

  await prisma.$disconnect();
}

checkUsers()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
