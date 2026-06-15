import { PrismaClient } from '@prisma/client';

const REMOTE_DATABASE_URL = process.env.REMOTE_DATABASE_URL;

if (!REMOTE_DATABASE_URL) {
  throw new Error("REMOTE_DATABASE_URL is required to push schema to a remote database.");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: REMOTE_DATABASE_URL,
    },
  },
});

async function main() {
  console.log('📡 Connecting to remote database...');
  console.log('🔧 Pushing schema to remote database...');
  
  try {
    await prisma.$connect();
    console.log('✅ Connected to remote database');
    
    // Push schema to remote database
    await prisma.$executeRawUnsafe(`
      SELECT * FROM prisma_schema_push(
        '${REMOTE_DATABASE_URL}'
      )
    `);
    
    console.log('✅ Schema pushed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
