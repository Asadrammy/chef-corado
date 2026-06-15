const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUsers() {
  const adminPwd = await bcrypt.hash('admin123', 10);
  const chefPwd = await bcrypt.hash('chef123', 10);
  const clientPwd = await bcrypt.hash('client123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPwd,
      role: 'ADMIN',
      verified: true,
      profileCompletion: 100,
      experienceLevel: 'EXPERT',
      termsAcceptedAt: new Date(),
      termsVersion: '2026-04',
      acceptedVia: 'register'
    }
  });

  await prisma.user.upsert({
    where: { email: 'chef@example.com' },
    update: {},
    create: {
      name: 'Chef User',
      email: 'chef@example.com',
      password: chefPwd,
      role: 'CHEF',
      verified: true,
      profileCompletion: 100,
      experienceLevel: 'EXPERT',
      termsAcceptedAt: new Date(),
      termsVersion: '2026-04',
      acceptedVia: 'register'
    }
  });

  await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      name: 'Client User',
      email: 'client@example.com',
      password: clientPwd,
      role: 'CLIENT',
      verified: true,
      profileCompletion: 85,
      experienceLevel: 'INTERMEDIATE',
      termsAcceptedAt: new Date(),
      termsVersion: '2026-04',
      acceptedVia: 'register'
    }
  });

  console.log('Test users created successfully');
  await prisma.$disconnect();
}

createTestUsers().catch(console.error);
