import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@chefmarketplace.com' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists')
      return
    }

    // Create admin user
    const hashedPassword = await hash('admin123', 12)
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@chefmarketplace.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    console.log('Admin user created successfully:', admin.email)
    console.log('Login credentials:')
    console.log('Email: admin@chefmarketplace.com')
    console.log('Password: admin123')
    
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
