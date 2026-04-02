import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting chef dashboard seed...');

  // Check if users already exist
  const existingChef = await prisma.user.findUnique({
    where: { email: 'chef@example.com' }
  });

  const existingClient = await prisma.user.findUnique({
    where: { email: 'client@example.com' }
  });

  let chef, client;

  // Create chef user if not exists
  if (!existingChef) {
    const chefPassword = await bcrypt.hash('chef123', 10);
    chef = await prisma.user.create({
      data: {
        name: 'John Chef',
        email: 'chef@example.com',
        password: chefPassword,
        role: 'CHEF',
        chefProfile: {
          create: {
            bio: 'Experienced chef specializing in Italian cuisine with 10+ years of professional experience',
            experience: 10,
            location: 'New York, NY',
            latitude: 40.7128,
            longitude: -74.0060,
            radius: 50,
            isApproved: true,
            verified: true,
            cuisineType: 'ITALIAN',
            profileCompletion: 85,
            experienceLevel: 'EXPERT'
          },
        },
      },
    });
    console.log('✅ Created chef user');
  } else {
    chef = existingChef;
    // Update existing chef profile to ensure coordinates are set
    await prisma.chefProfile.update({
      where: { userId: chef.id },
      data: {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 50
      }
    });
    console.log('ℹ️ Chef user already exists - updated coordinates');
  }

  // Create client user if not exists
  if (!existingClient) {
    const clientPassword = await bcrypt.hash('client123', 10);
    client = await prisma.user.create({
      data: {
        name: 'Jane Client',
        email: 'client@example.com',
        password: clientPassword,
        role: 'CLIENT',
      },
    });
    console.log('✅ Created client user');
  } else {
    client = existingClient;
    console.log('ℹ️ Client user already exists');
  }

  // Get chef profile
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: chef.id },
  });

  if (!chefProfile) {
    throw new Error('Chef profile not found');
  }

  // Clean up existing data for this chef to avoid duplicates
  await prisma.review.deleteMany({ where: { chefId: chefProfile.id } });
  await prisma.payment.deleteMany({ 
    where: { booking: { chefId: chefProfile.id } } 
  });
  await prisma.booking.deleteMany({ where: { chefId: chefProfile.id } });
  await prisma.proposal.deleteMany({ where: { chefId: chefProfile.id } });
  await prisma.request.deleteMany({ where: { clientId: client.id } });

  console.log('🧹 Cleaned up existing data');

  // Create realistic requests (3-5 open requests) - all within chef's service radius
  const requests = await prisma.request.createMany({
    data: [
      {
        clientId: client.id,
        title: 'Anniversary Dinner for 6',
        description: 'Romantic anniversary celebration with intimate Italian cuisine',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: 'Manhattan, New York',
        latitude: 40.7200, // Close to chef's location
        longitude: -74.0000, // Close to chef's location
        budget: 1200,
        details: 'Wine pairing and dessert special requested'
      },
      {
        clientId: client.id,
        title: 'Corporate Team Building Event',
        description: 'Interactive cooking class for 15 team members',
        eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        location: 'Brooklyn, New York',
        latitude: 40.7000, // Close to chef's location
        longitude: -73.9900, // Close to chef's location
        budget: 3000,
        details: 'Vegetarian options needed for 3 participants'
      },
      {
        clientId: client.id,
        title: 'Birthday Party Celebration',
        description: 'Fun birthday party with Italian themed menu',
        eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        location: 'Queens, New York',
        latitude: 40.7300, // Close to chef's location
        longitude: -74.0100, // Close to chef's location
        budget: 800,
        details: 'Birthday cake and party favors included'
      },
      {
        clientId: client.id,
        title: 'Private Dinner Party',
        description: 'Exclusive dinner party for close friends',
        eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        location: 'Upper East Side, Manhattan',
        latitude: 40.7700, // Close to chef's location
        longitude: -73.9500, // Close to chef's location
        budget: 1500,
        details: 'Five-course tasting menu experience'
      },
      {
        clientId: client.id,
        title: 'Weekend Brunch Gathering',
        description: 'Casual weekend brunch with Italian specialties',
        eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        location: 'West Village, Manhattan',
        latitude: 40.7300, // Close to chef's location
        longitude: -74.0030, // Close to chef's location
        budget: 600,
        details: 'Mimosa bar and pasta making station'
      }
    ]
  });

  console.log('✅ Created 5 open requests');

  // Get the created requests
  const createdRequests = await prisma.request.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' }
  });

  // Create proposals for some requests
  const proposals = await prisma.proposal.createMany({
    data: [
      {
        requestId: createdRequests[0].id,
        chefId: chefProfile.id,
        price: 1100,
        message: 'Four-course seasonal menu with wine pairing and anniversary dessert',
        status: 'ACCEPTED'
      },
      {
        requestId: createdRequests[1].id,
        chefId: chefProfile.id,
        price: 2800,
        message: 'Interactive pasta making class with team competition and prizes',
        status: 'PENDING'
      },
      {
        requestId: createdRequests[2].id,
        chefId: chefProfile.id,
        price: 750,
        message: 'Birthday feast with cake and Italian party specialties',
        status: 'PENDING'
      }
    ]
  });

  console.log('✅ Created 3 proposals');

  // Get the proposals
  const createdProposals = await prisma.proposal.findMany({
    where: { chefId: chefProfile.id },
    include: { request: true }
  });

  // Create bookings: 1 active, 2 completed with recent dates
  const bookings = await prisma.booking.createMany({
    data: [
      // Active booking
      {
        clientId: client.id,
        chefId: chefProfile.id,
        proposalId: createdProposals.find(p => p.status === 'ACCEPTED')?.id,
        eventDate: createdRequests[0].eventDate,
        location: createdRequests[0].location,
        latitude: createdRequests[0].latitude,
        longitude: createdRequests[0].longitude,
        guestCount: 6,
        totalPrice: 1100,
        bookingType: 'PROPOSAL',
        status: 'CONFIRMED', // Active booking
        specialRequests: 'Wine pairing and anniversary dessert',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      // Completed booking 1 (recent)
      {
        clientId: client.id,
        chefId: chefProfile.id,
        eventDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        location: 'SoHo, Manhattan',
        latitude: 40.7233,
        longitude: -73.9967,
        guestCount: 4,
        totalPrice: 850,
        bookingType: 'INSTANT',
        status: 'COMPLETED',
        specialRequests: 'Gluten-free pasta options',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      // Completed booking 2 (more recent)
      {
        clientId: client.id,
        chefId: chefProfile.id,
        eventDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
        location: 'Tribeca, Manhattan',
        latitude: 40.7190,
        longitude: -74.0073,
        guestCount: 8,
        totalPrice: 1500,
        bookingType: 'PROPOSAL',
        status: 'COMPLETED',
        specialRequests: 'Surprise engagement celebration',
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) // 12 days ago
      }
    ]
  });

  console.log('✅ Created 3 bookings (1 active, 2 completed)');

  // Get the created bookings
  const createdBookings = await prisma.booking.findMany({
    where: { chefId: chefProfile.id },
    orderBy: { createdAt: 'desc' }
  });

  // Create payments for completed bookings
  const payments = await prisma.payment.createMany({
    data: createdBookings
      .filter(booking => booking.status === 'COMPLETED')
      .map((booking, index) => ({
        bookingId: booking.id,
        totalAmount: booking.totalPrice,
        commissionAmount: booking.totalPrice * 0.15, // 15% commission
        chefAmount: booking.totalPrice * 0.85, // 85% to chef
        status: 'COMPLETED',
        releasedAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000) // Released at different times
      }))
  });

  console.log('✅ Created payments for completed bookings');

  // Create reviews for completed bookings
  const reviews = await prisma.review.createMany({
    data: createdBookings
      .filter(booking => booking.status === 'COMPLETED')
      .map((booking, index) => ({
        rating: [5, 4][index], // 5 and 4 star ratings
        comment: index === 0 
          ? 'Absolutely amazing experience! The food was exceptional and John was a fantastic host. Highly recommend!'
          : 'Great dinner party! John created a wonderful atmosphere and the food was delicious. Would book again!',
        clientId: client.id,
        chefId: chefProfile.id,
        bookingId: booking.id
      }))
  });

  console.log('✅ Created reviews for completed bookings');

  // Calculate totals
  const totalEarnings = createdBookings
    .filter(b => b.status === 'COMPLETED')
    .reduce((sum, booking) => sum + (booking.totalPrice * 0.85), 0);

  const activeBookings = createdBookings.filter(b => b.status === 'CONFIRMED').length;
  const completedBookings = createdBookings.filter(b => b.status === 'COMPLETED').length;
  const availableRequests = createdRequests.length;

  console.log('\n🎉 CHEF DASHBOARD SEED COMPLETE!');
  console.log('\n📊 DASHBOARD WILL SHOW:');
  console.log(`💰 Total Earnings: $${totalEarnings.toFixed(2)}`);
  console.log(`📅 Active Bookings: ${activeBookings}`);
  console.log(`✅ Completed Bookings: ${completedBookings}`);
  console.log(`📋 Available Requests: ${availableRequests}`);
  console.log(`⭐ Average Rating: 4.5`);
  console.log('\n👤 LOGIN CREDENTIALS:');
  console.log('Chef: chef@example.com / chef123');
  console.log('Client: client@example.com / client123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
