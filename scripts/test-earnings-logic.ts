import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEarningsAPI() {
  console.log('🔍 Testing Earnings API Logic...\n');

  // Get chef profile
  const chefProfile = await prisma.chefProfile.findFirst({
    include: { user: true }
  });

  if (!chefProfile) {
    console.log('❌ Chef profile not found');
    return;
  }

  console.log(`✅ Found chef: ${chefProfile.user.name} (${chefProfile.user.email})`);

  // Fetch completed bookings with payments
  const completedBookings = await prisma.booking.findMany({
    where: {
      chefId: chefProfile.id,
      status: 'COMPLETED',
      payments: {
        status: 'COMPLETED'
      }
    },
    include: {
      payments: {
        where: {
          status: 'COMPLETED'
        }
      },
      client: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`\n📊 Found ${completedBookings.length} completed bookings with payments:`);

  completedBookings.forEach((booking: any, index: number) => {
    const bookingEarnings = booking.payments ? 
      (booking.payments.totalAmount - booking.payments.commissionAmount) : 0;
    
    console.log(`  ${index + 1}. ${booking.client.name} - $${bookingEarnings.toFixed(2)} (${booking.createdAt.toLocaleDateString()})`);
  });

  // Group earnings by month
  const earningsByMonth = new Map<string, number>();

  completedBookings.forEach((booking: any) => {
    const month = booking.createdAt.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    
    const bookingEarnings = booking.payments ? 
      (booking.payments.totalAmount - booking.payments.commissionAmount) : 0;

    const currentEarnings = earningsByMonth.get(month) || 0;
    earningsByMonth.set(month, currentEarnings + bookingEarnings);
  });

  // Convert to array format and sort
  const earningsData = Array.from(earningsByMonth.entries())
    .map(([month, earnings]) => ({
      month: month.split(' ')[0],
      earnings: Math.round(earnings * 100) / 100
    }))
    .sort((a, b) => {
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

  console.log(`\n📈 Earnings by month:`);
  console.log(JSON.stringify(earningsData, null, 2));

  const totalEarnings = earningsData.reduce((sum, item) => sum + item.earnings, 0);
  console.log(`\n💰 Total earnings: $${totalEarnings.toFixed(2)}`);

  await prisma.$disconnect();
}

testEarningsAPI()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
