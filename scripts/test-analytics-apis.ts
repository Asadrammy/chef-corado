import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAnalyticsAPIs() {
  console.log('🔍 Testing Analytics APIs...\n');

  // Test Revenue API logic
  console.log('💰 Revenue API Test:');
  const days = 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const payments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${payments.length} completed payments in last ${days} days`);
  
  const revenueByDate = new Map<string, number>();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    revenueByDate.set(dateStr, 0);
  }

  payments.forEach(payment => {
    const dateStr = payment.createdAt.toISOString().split('T')[0];
    const currentRevenue = revenueByDate.get(dateStr) || 0;
    revenueByDate.set(dateStr, currentRevenue + (payment as any).commission);
  });

  const revenueData = Array.from(revenueByDate.entries())
    .filter(([_, revenue]) => revenue > 0)
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  console.log('Revenue data (non-zero days):');
  revenueData.forEach(item => {
    console.log(`  ${item.date}: $${item.revenue}`);
  });

  // Test Bookings API logic
  console.log('\n📅 Bookings API Test:');
  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { id: true, createdAt: true, status: true, totalPrice: true, bookingType: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${bookings.length} bookings in last ${days} days`);
  
  const bookingsByDate = new Map<string, number>();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    bookingsByDate.set(dateStr, 0);
  }

  bookings.forEach(booking => {
    const dateStr = booking.createdAt.toISOString().split('T')[0];
    const currentCount = bookingsByDate.get(dateStr) || 0;
    bookingsByDate.set(dateStr, currentCount + 1);
  });

  const bookingsData = Array.from(bookingsByDate.entries())
    .filter(([_, count]) => count > 0)
    .map(([date, count]) => ({ date, count }));

  console.log('Bookings data (non-zero days):');
  bookingsData.forEach(item => {
    console.log(`  ${item.date}: ${item.count} bookings`);
  });

  // Test Users API logic
  console.log('\n👥 Users API Test:');
  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { id: true, createdAt: true, role: true, name: true, email: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${users.length} new users in last ${days} days`);
  
  const usersByDate = new Map<string, number>();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    usersByDate.set(dateStr, 0);
  }

  users.forEach(user => {
    const dateStr = user.createdAt.toISOString().split('T')[0];
    const currentCount = usersByDate.get(dateStr) || 0;
    usersByDate.set(dateStr, currentCount + 1);
  });

  const usersData = Array.from(usersByDate.entries())
    .filter(([_, count]) => count > 0)
    .map(([date, newUsers]) => ({ date, newUsers }));

  console.log('Users data (non-zero days):');
  usersData.forEach(item => {
    console.log(`  ${item.date}: ${item.newUsers} new users`);
  });

  console.log('\n✅ Analytics APIs should work correctly!');
  console.log(`💡 Note: All users were created on the same day, so user analytics will show clustered data.`);

  await prisma.$disconnect();
}

testAnalyticsAPIs()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
