import { PrismaClient } from '@prisma/client';
import { compare } from 'bcrypt';

const prisma = new PrismaClient();

async function checkPasswordHashing() {
  console.log('🔍 Checking Password Hashing...\n');

  const chefUser = await prisma.user.findUnique({
    where: { email: 'chef@example.com' }
  });

  if (!chefUser) {
    console.log('❌ Chef user not found');
    return;
  }

  console.log(`✅ Found chef user: ${chefUser.name}`);
  console.log(`📧 Email: ${chefUser.email}`);
  console.log(`🔐 Stored password hash: ${chefUser.password.substring(0, 20)}...`);

  // Test password verification
  const testPasswords = ['chef123', 'admin123', 'client123', 'password'];
  
  for (const testPwd of testPasswords) {
    const isValid = await compare(testPwd, chefUser.password);
    console.log(`🔍 Testing "${testPwd}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  }

  // Check other users too
  const otherUsers = await prisma.user.findMany({
    where: { email: { in: ['admin@example.com', 'client@example.com'] } }
  });

  console.log('\n📋 Other Users:');
  for (const user of otherUsers) {
    const isValid = await compare(user.email.split('@')[0].replace('.', ''), user.password);
    console.log(`${user.email}: ${isValid ? '✅' : '❌'} (expected: ${user.email.split('@')[0].replace('.', '')})`);
  }

  await prisma.$disconnect();
}

checkPasswordHashing()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
