import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeBookingData() {
  console.log('🔍 Analyzing Current Booking Data...\n');

  // Get chef profile
  const chefProfile = await prisma.chefProfile.findFirst({
    include: { user: true }
  });

  if (!chefProfile) {
    console.log('❌ Chef profile not found');
    return;
  }

  console.log(`✅ Chef: ${chefProfile.user.name}`);

  // Get all completed bookings with payments
  const allBookings = await prisma.booking.findMany({
    where: {
      chefId: chefProfile.id,
      status: 'COMPLETED'
    },
    include: {
      payments: true,
      client: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`\n📊 Total completed bookings: ${allBookings.length}`);

  // Analyze time distribution
  const monthlyDistribution = new Map<string, number>();
  const monthlyDetails = new Map<string, any[]>();

  allBookings.forEach((booking, index) => {
    const month = booking.createdAt.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    const date = booking.createdAt.toLocaleDateString('en-US');
    
    const completedPayments = booking.payments && booking.payments.status === 'COMPLETED' ? [booking.payments] : [];
    const earnings = completedPayments.reduce((sum: number, payment: any) => sum + (payment.totalAmount - payment.commissionAmount), 0);

    monthlyDistribution.set(month, (monthlyDistribution.get(month) || 0) + earnings);
    
    if (!monthlyDetails.has(month)) {
      monthlyDetails.set(month, []);
    }
    monthlyDetails.get(month)!.push({
      index: index + 1,
      client: booking.client.name,
      date: date,
      earnings: earnings,
      totalPrice: booking.totalPrice
    });
  });

  console.log('\n📅 Monthly Distribution:');
  monthlyDistribution.forEach((earnings, month) => {
    console.log(`  ${month}: $${earnings.toFixed(2)} (${monthlyDetails.get(month)!.length} bookings)`);
  });

  console.log('\n📋 Detailed Breakdown:');
  monthlyDetails.forEach((bookings, month) => {
    console.log(`\n${month}:`);
    bookings.forEach(booking => {
      console.log(`  ${booking.index}. ${booking.client} - $${booking.earnings.toFixed(2)} (${booking.date})`);
    });
  });

  // Check if all bookings are in same month
  if (monthlyDistribution.size === 1) {
    console.log('\n⚠️  PROBLEM: All bookings are in the same month!');
    console.log('Need to distribute bookings across multiple months for realistic trend.');
  } else {
    console.log(`\n✅ Good: Bookings distributed across ${monthlyDistribution.size} months`);
  }

  await prisma.$disconnect();
}

analyzeBookingData()
  .catch((e) => {
    console.error('❌ Analysis failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
