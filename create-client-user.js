const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createMissingClient() {
  console.log('🔧 Creating missing client user...');
  
  try {
    // Check if client already exists
    const existingClient = await prisma.user.findFirst({
      where: { email: 'client@example.com' }
    });
    
    if (existingClient) {
      console.log('✅ Client user already exists');
      return;
    }
    
    // Create client user
    const clientPassword = await bcrypt.hash('client123', 10);
    const client = await prisma.user.create({
      data: {
        name: 'Jane Client',
        email: 'client@example.com',
        password: clientPassword,
        role: 'CLIENT',
      },
    });
    
    console.log('✅ Client user created:', {
      id: client.id,
      name: client.name,
      email: client.email,
      role: client.role
    });
    
  } catch (error) {
    console.error('❌ Failed to create client:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingClient();
