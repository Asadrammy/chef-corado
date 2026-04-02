import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function createHistoricalUsers() {
  console.log('🕐 Creating Historical Users for Realistic Analytics...\n');

  // Historical user data spread across different dates
  const historicalUsers = [
    {
      name: 'Alice Johnson',
      email: 'alice.j@example.com',
      role: 'CLIENT',
      createdAt: new Date('2026-01-15'),
      password: 'client123'
    },
    {
      name: 'Bob Smith',
      email: 'bob.s@example.com', 
      role: 'CLIENT',
      createdAt: new Date('2026-02-03'),
      password: 'client123'
    },
    {
      name: 'Carol Davis',
      email: 'carol.d@example.com',
      role: 'CLIENT', 
      createdAt: new Date('2026-02-20'),
      password: 'client123'
    },
    {
      name: 'David Wilson',
      email: 'david.w@example.com',
      role: 'CLIENT',
      createdAt: new Date('2026-03-05'),
      password: 'client123'
    },
    {
      name: 'Emma Brown',
      email: 'emma.b@example.com',
      role: 'CLIENT',
      createdAt: new Date('2026-03-18'),
      password: 'client123'
    }
  ];

  console.log(`Creating ${historicalUsers.length} historical users...`);

  for (const userData of historicalUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          createdAt: userData.createdAt,
          updatedAt: userData.createdAt
        }
      });

      console.log(`✅ Created ${userData.name} (${userData.email}) - ${userData.createdAt.toLocaleDateString()}`);

    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error);
    }
  }

  console.log('\n🎉 Historical users created successfully!');
  
  // Get final user stats
  const totalUsers = await prisma.user.count();
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });

  console.log('\n📊 Updated User Stats:');
  console.log(`Total users: ${totalUsers}`);
  usersByRole.forEach(stat => {
    console.log(`  ${stat.role}: ${stat._count.id}`);
  });

  await prisma.$disconnect();
}

createHistoricalUsers()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
