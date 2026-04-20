/**
 * Production Database Initialization Script
 * 
 * This script should only be run ONCE when the database is first created.
 * It checks if users exist before seeding to prevent data loss.
 * 
 * Usage: npx ts-node scripts/production-init.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function initProductionDatabase() {
  console.log('🚀 Initializing production database...');

  try {
    // Check if database already has users
    const existingUsers = await prisma.user.count();
    
    if (existingUsers > 0) {
      console.log(`✅ Database already initialized with ${existingUsers} users. Skipping seed.`);
      console.log('ℹ️  To re-seed, manually clear the database first.');
      return;
    }

    console.log('👥 Creating initial users...');
    
    const adminPwd = await bcrypt.hash('admin123', 10);
    const chefPwd = await bcrypt.hash('chef123', 10);
    const clientPwd = await bcrypt.hash('client123', 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: adminPwd,
        role: 'ADMIN',
        verified: true,
        profileCompletion: 100,
        experienceLevel: 'EXPERT'
      }
    });

    console.log('✅ Created admin user:', admin.email);

    // Create chef user
    const chef = await prisma.user.create({
      data: {
        name: 'Chef User',
        email: 'chef@example.com',
        password: chefPwd,
        role: 'CHEF',
        verified: true,
        profileCompletion: 100
      }
    });

    console.log('✅ Created chef user:', chef.email);

    // Create client user
    const client = await prisma.user.create({
      data: {
        name: 'Client User',
        email: 'client@example.com',
        password: clientPwd,
        role: 'CLIENT',
        verified: true,
        profileCompletion: 100
      }
    });

    console.log('✅ Created client user:', client.email);

    console.log('\n✅ Production database initialized successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log('  Admin: admin@example.com / admin123');
    console.log('  Chef: chef@example.com / chef123');
    console.log('  Client: client@example.com / client123');

  } catch (error) {
    console.error('❌ Failed to initialize production database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initProductionDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
