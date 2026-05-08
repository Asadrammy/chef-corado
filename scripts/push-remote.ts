import { PrismaClient } from '@prisma/client';

const REMOTE_DATABASE_URL = "postgresql://postgresql_q3ho_user:j5N4g8KZXnFxijDZcHYXWDaKbcJ3fUT4@dpg-d7kl2vho3t8c73ds4li0-a.singapore-postgres.render.com/postgresql_q3ho?connection_limit=10&pool_timeout=20&connect_timeout=10";

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
