import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create chef user and profile
  const chefPassword = await bcrypt.hash('chef1234', 10);
  const chef = await prisma.user.create({
    data: {
      name: 'John Chef',
      email: 'chef@example.com',
      password: chefPassword,
      role: 'CHEF',
      chefProfile: {
        create: {
          bio: 'Experienced chef specializing in Italian cuisine',
          experience: 10,
          location: 'New York',
          radius: 50,
          isApproved: true,
        },
      },
    },
  });

  // Create client user
  const clientPassword = await bcrypt.hash('client1234', 10);
  const client = await prisma.user.create({
    data: {
      name: 'Jane Client',
      email: 'client@example.com',
      password: clientPassword,
      role: 'CLIENT',
    },
  });

  // Create experiences for the chef
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: chef.id },
  });

  if (!chefProfile) {
    throw new Error('Chef profile not found after seeding');
  }

  const experiences = await prisma.experience.createMany({
    data: [
      {
        title: 'Intimate Italian Dinner',
        description: 'Four-course Italian dinner with fresh, seasonal ingredients.',
        price: 120,
        duration: 180,
        includedServices: JSON.stringify(['Menu planning', 'Groceries', 'Cooking', 'Cleanup']),
        eventType: 'PRIVATE_DINNER',
        cuisineType: 'ITALIAN',
        maxGuests: 10,
        minGuests: 2,
        difficulty: 'MEDIUM',
        tags: JSON.stringify(['romantic', 'italian', 'seasonal']),
        experienceImage: null,
        chefId: chefProfile.id,
        isActive: true,
      },
      {
        title: 'Hands-on Pasta Workshop',
        description: 'Learn to make fresh pasta from scratch in a fun, interactive class.',
        price: 90,
        duration: 150,
        includedServices: JSON.stringify(['Ingredients', 'Equipment', 'Recipes to take home']),
        eventType: 'COOKING_CLASS',
        cuisineType: 'ITALIAN',
        maxGuests: 12,
        minGuests: 4,
        difficulty: 'EASY',
        tags: JSON.stringify(['class', 'pasta', 'group']),
        experienceImage: null,
        chefId: chefProfile.id,
        isActive: true,
      },
      {
        title: 'Corporate Team-Building Tasting Menu',
        description: 'Multi-course tasting menu tailored for corporate events.',
        price: 150,
        duration: 210,
        includedServices: JSON.stringify(['Custom menu', 'On-site cooking', 'Service staff coordination']),
        eventType: 'TEAM_BUILDING',
        cuisineType: 'ITALIAN',
        maxGuests: 30,
        minGuests: 8,
        difficulty: 'HARD',
        tags: JSON.stringify(['corporate', 'tasting', 'premium']),
        experienceImage: null,
        chefId: chefProfile.id,
        isActive: true,
      },
    ],
  });

  // Create availability slots for the chef
  const today = new Date();
  const availabilityDates = [1, 3, 7].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  await prisma.availability.createMany({
    data: availabilityDates.map((date) => ({
      chefId: chefProfile.id,
      date,
      startTime: '17:00',
      endTime: '22:00',
      isAvailable: true,
      recurringPattern: null,
      maxBookings: 3,
      currentBookings: 0,
    })),
  });

  // Create sample client requests
  const request1 = await prisma.request.create({
    data: {
      clientId: client.id,
      title: 'Birthday dinner for 8',
      description: 'Intimate birthday celebration with a multi-course Italian menu.',
      eventDate: availabilityDates[0],
      location: 'Manhattan, New York',
      latitude: null,
      longitude: null,
      budget: 1000,
      details: 'Gluten-free option needed for one guest.',
    },
  });

  const request2 = await prisma.request.create({
    data: {
      clientId: client.id,
      title: 'Team offsite dinner',
      description: 'Casual corporate dinner with shared plates.',
      eventDate: availabilityDates[1],
      location: 'Brooklyn, New York',
      latitude: null,
      longitude: null,
      budget: 2500,
      details: 'Mix of vegetarian and meat options; buffet style.',
    },
  });

  // Create proposals from the chef for these requests
  const proposal1 = await prisma.proposal.create({
    data: {
      requestId: request1.id,
      chefId: chefProfile.id,
      price: 900,
      message: 'Four-course seasonal menu with dessert and wine pairing.',
      status: 'ACCEPTED',
    },
  });

  const proposal2 = await prisma.proposal.create({
    data: {
      requestId: request2.id,
      chefId: chefProfile.id,
      price: 2300,
      message: 'Shared plates and family-style service ideal for teams.',
      status: 'PENDING',
    },
  });

  // Create a booking linked to the accepted proposal
  const booking1 = await prisma.booking.create({
    data: {
      clientId: client.id,
      chefId: chefProfile.id,
      proposalId: proposal1.id,
      eventDate: request1.eventDate,
      location: request1.location,
      latitude: request1.latitude,
      longitude: request1.longitude,
      guestCount: 8,
      totalPrice: proposal1.price,
      bookingType: 'PROPOSAL',
      status: 'CONFIRMED',
      specialRequests: request1.details,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      totalAmount: booking1.totalPrice,
      commissionAmount: booking1.totalPrice * 0.15,
      chefAmount: booking1.totalPrice * 0.85,
      status: 'RELEASED',
    } as any,
  });

  console.log('Seed data created successfully!');
  console.log({ admin, chef, client, experiences, request1, request2, proposal1, proposal2, booking1 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
