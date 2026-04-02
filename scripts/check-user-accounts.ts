import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserAccounts() {
  console.log('🔍 Checking User Accounts...\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${users.length} users:`);
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) - ${user.role} - Created: ${user.createdAt.toLocaleDateString()}`);
  });

  // Check specifically for chef account
  const chefUser = users.find(u => u.email === 'chef@example.com');
  if (chefUser) {
    console.log(`\n✅ Chef account found: ${chefUser.name} (ID: ${chefUser.id})`);
    
    // Check if chef profile exists
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: chefUser.id },
      include: { user: true }
    });
    
    if (chefProfile) {
      console.log(`✅ Chef profile exists: ${chefProfile.user.name}`);
      console.log(`   - Approved: ${chefProfile.isApproved}`);
      console.log(`   - Location: ${chefProfile.location}`);
      console.log(`   - Experience: ${chefProfile.experience} years`);
    } else {
      console.log(`❌ No chef profile found for user`);
    }
  } else {
    console.log(`\n❌ Chef account not found!`);
    console.log(`Available chef emails:`);
    const chefUsers = users.filter(u => u.role === 'CHEF');
    chefUsers.forEach(user => {
      console.log(`  - ${user.email}`);
    });
  }

  await prisma.$disconnect();
}

checkUserAccounts()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
