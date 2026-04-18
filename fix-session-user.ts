import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSessionUser() {
  try {
    // Get all users and their chef profiles
    const users = await prisma.user.findMany({
      include: {
        chefProfile: true
      }
    })

    console.log(`Found ${users.length} users`)

    for (const user of users) {
      if (user.chefProfile) {
        // Update chef profile with only core fields that definitely exist
        await prisma.chefProfile.update({
          where: { userId: user.id },
          data: {
            // Use only core fields that exist in the ChefProfile model
            bio: user.chefProfile.bio || null,
            experience: user.chefProfile.experience || 0,
            location: user.chefProfile.location || '',
            latitude: user.chefProfile.latitude || null,
            longitude: user.chefProfile.longitude || null,
            radius: user.chefProfile.radius || 25,
            isApproved: user.chefProfile.isApproved || false,
            isBanned: user.chefProfile.isBanned || false,
            verified: user.chefProfile.verified || false,
            profileCompletion: user.chefProfile.profileCompletion || 0,
            experienceLevel: user.chefProfile.experienceLevel || 'BEGINNER',
            cuisineType: user.chefProfile.cuisineType || null,
            profileImage: user.chefProfile.profileImage || null
            // Note: chefType and other enhanced fields may need a database migration
            // to be added properly. For now, we'll just update the core fields.
          }
        })
        
        console.log(`Fixed chef profile for user: ${user.email}`)
      }
    }

    console.log('Session user fix completed successfully')
  } catch (error) {
    console.error('Error fixing session user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixSessionUser()
