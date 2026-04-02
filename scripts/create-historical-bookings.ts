import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createHistoricalBookings() {
  console.log('🕐 Creating Historical Bookings for Realistic Trend...\n');

  // Get chef profile
  const chefProfile = await prisma.chefProfile.findFirst({
    include: { user: true }
  });

  if (!chefProfile) {
    console.log('❌ Chef profile not found');
    return;
  }

  console.log(`✅ Chef: ${chefProfile.user.name}`);

  // Get clients
  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' }
  });

  if (clients.length < 3) {
    console.log('❌ Need at least 3 clients for realistic bookings');
    return;
  }

  console.log(`✅ Found ${clients.length} clients`);

  // Define realistic historical bookings with proper time distribution
  const historicalBookings = [
    // January 2026 - Starting small
    {
      clientIndex: 0, // First client
      eventDate: new Date('2026-01-15'),
      createdAt: new Date('2026-01-10'),
      guestCount: 2,
      totalPrice: 280,
      location: "Manhattan, NY",
      specialRequests: "Anniversary dinner - quiet table preferred"
    },
    // February 2026 - Growth
    {
      clientIndex: 1, // Second client
      eventDate: new Date('2026-02-08'),
      createdAt: new Date('2026-02-03'),
      guestCount: 4,
      totalPrice: 450,
      location: "Brooklyn, NY",
      specialRequests: "Birthday celebration for 4 people"
    },
    {
      clientIndex: 2, // Third client
      eventDate: new Date('2026-02-22'),
      createdAt: new Date('2026-02-18'),
      guestCount: 3,
      totalPrice: 380,
      location: "Queens, NY",
      specialRequests: "Business dinner - professional atmosphere"
    },
    // March 2026 - Continued growth (existing bookings are here)
    // We'll keep the existing March bookings and add one more
    {
      clientIndex: 0, // Repeat client
      eventDate: new Date('2026-03-12'),
      createdAt: new Date('2026-03-08'),
      guestCount: 6,
      totalPrice: 650,
      location: "Manhattan, NY",
      specialRequests: "Corporate team building event"
    }
  ];

  console.log(`\n📅 Creating ${historicalBookings.length} historical bookings...`);

  // Create bookings and payments
  for (const bookingData of historicalBookings) {
    const client = clients[bookingData.clientIndex];
    
    try {
      // Create booking
      const booking = await prisma.booking.create({
        data: {
          clientId: client.id,
          chefId: chefProfile.id,
          eventDate: bookingData.eventDate,
          location: bookingData.location,
          guestCount: bookingData.guestCount,
          totalPrice: bookingData.totalPrice,
          bookingType: 'INSTANT',
          status: 'COMPLETED',
          specialRequests: bookingData.specialRequests,
          createdAt: bookingData.createdAt,
          updatedAt: bookingData.createdAt
        }
      });

      // Create completed payment (15% commission)
      const commission = bookingData.totalPrice * 0.15;
      const netEarnings = bookingData.totalPrice - commission;

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          totalAmount: bookingData.totalPrice,
          commissionAmount: commission,
          chefAmount: bookingData.totalPrice - commission,
          status: 'RELEASED',
          createdAt: bookingData.eventDate, // Payment completed on event date
          updatedAt: bookingData.eventDate
        } as any,
      });

      console.log(`✅ ${bookingData.createdAt.toLocaleDateString()}: ${client.name} - $${netEarnings.toFixed(2)} (${bookingData.eventDate.toLocaleDateString()})`);

    } catch (error) {
      console.error(`❌ Failed to create booking for ${client.name}:`, error);
    }
  }

  console.log('\n🎉 Historical bookings created successfully!');
  
  await prisma.$disconnect();
}

createHistoricalBookings()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
