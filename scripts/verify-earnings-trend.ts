import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEarningsTrend() {
  console.log('🔍 Verifying earnings trend data...\n');

  // Get chef profile
  const chef = await prisma.user.findUnique({
    where: { email: 'chef@example.com' },
    include: { chefProfile: true }
  });

  if (!chef?.chefProfile) {
    console.log('❌ Chef profile not found');
    return;
  }

  console.log(`✅ Chef found: ${chef.name}`);

  // Get completed bookings from last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const completedBookings = await prisma.booking.findMany({
    where: {
      chefId: chef.chefProfile.id,
      status: 'COMPLETED',
      createdAt: { gte: thirtyDaysAgo }
    },
    include: { payments: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📅 Found ${completedBookings.length} completed bookings in last 30 days`);

  // Process earnings trend data by day
  const earningsTrend = new Map<string, number>();
  
  // Initialize all days with 0 earnings
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    earningsTrend.set(dateKey, 0);
  }
  
  // Add actual earnings from completed bookings
  completedBookings.forEach(booking => {
    const dateKey = booking.createdAt.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const bookingEarnings = booking.payments ? 
      (booking.payments.chefAmount || 0) : 0;

    const currentEarnings = earningsTrend.get(dateKey) || 0;
    earningsTrend.set(dateKey, currentEarnings + bookingEarnings);
  });

  // Convert to array and show last 14 days
  const processedEarningsTrend = Array.from(earningsTrend.entries())
    .map(([date, earnings]) => ({
      date,
      earnings: Math.round(earnings * 100) / 100
    }))
    .slice(-14);

  console.log('\n📊 EARNINGS TREND DATA (Last 14 Days):');
  processedEarningsTrend.forEach(item => {
    if (item.earnings > 0) {
      console.log(`💰 ${item.date}: $${item.earnings.toFixed(2)}`);
    } else {
      console.log(`📅 ${item.date}: $0.00`);
    }
  });

  const daysWithEarnings = processedEarningsTrend.filter(item => item.earnings > 0);
  console.log(`\n📈 Summary:`);
  console.log(`- Days with earnings: ${daysWithEarnings.length}/14`);
  console.log(`- Total earnings in trend: $${daysWithEarnings.reduce((sum, item) => sum + item.earnings, 0).toFixed(2)}`);

  console.log('\n🎉 EARNINGS TREND VERIFICATION COMPLETE!');
  console.log('\nThe chart should now show:');
  console.log('- 14 days of data');
  console.log('- Bars for days with earnings');
  console.log('- Gray bars for days with no earnings');
  console.log('- Proper date labels');
}

verifyEarningsTrend()
  .catch((e) => {
    console.error('❌ Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
