import { PrismaClient } from '@prisma/client';
import { compare } from 'bcrypt';

const prisma = new PrismaClient();

async function findCorrectPasswords() {
  console.log('🔍 Finding Correct Passwords...\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true
    }
  });

  const commonPasswords = [
    'chef123', 'admin123', 'client123', 'password', '123456',
    'chef', 'admin', 'client', 'test', 'demo'
  ];

  for (const user of users) {
    console.log(`\n👤 ${user.name} (${user.email}) - ${user.role}`);
    
    let foundPassword = null;
    for (const testPwd of commonPasswords) {
      try {
        const isValid = await compare(testPwd, user.password);
        if (isValid) {
          foundPassword = testPwd;
          console.log(`✅ Password: "${testPwd}"`);
          break;
        }
      } catch (error) {
        // Skip invalid password tests
      }
    }
    
    if (!foundPassword) {
      // Try email-based passwords
      const emailBasedPwd = user.email.split('@')[0].replace('.', '');
      try {
        const isValid = await compare(emailBasedPwd, user.password);
        if (isValid) {
          foundPassword = emailBasedPwd;
          console.log(`✅ Password: "${emailBasedPwd}" (email-based)`);
        }
      } catch (error) {
        // Skip
      }
    }
    
    if (!foundPassword) {
      console.log(`❌ No common password found`);
    }
  }

  await prisma.$disconnect();
}

findCorrectPasswords()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
