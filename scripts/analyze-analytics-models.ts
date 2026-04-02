import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDataModels() {
  console.log('🔍 Analyzing Data Models for Analytics...\n');

  // Check payments model for commission data
  console.log('💳 Payments Model Analysis:');
  const payments = await prisma.payment.findMany({
    include: {
      booking: {
        include: {
          client: true,
          chef: { include: { user: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Found ${payments.length} recent payments:`);
  payments.forEach((payment, index) => {
    console.log(`  ${index + 1}. $${(payment as any).amount} - Commission: $${(payment as any).commission} (${payment.status})`);
    console.log(`     Client: ${payment.booking.client.name}, Chef: ${payment.booking.chef.user.name}`);
    console.log(`     Date: ${payment.createdAt.toLocaleDateString()}`);
  });

  // Check bookings model for status distribution
  console.log('\n📅 Bookings Model Analysis:');
  const bookingStats = await prisma.booking.groupBy({
    by: ['status'],
    _count: { id: true },
    _sum: { totalPrice: true }
  });

  console.log('Booking status distribution:');
  bookingStats.forEach(stat => {
    console.log(`  ${stat.status}: ${stat._count.id} bookings, Total: $${stat._sum.totalPrice || 0}`);
  });

  // Check user creation dates for user analytics
  console.log('\n👥 Users Model Analysis:');
  const userStats = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });

  console.log('User role distribution:');
  userStats.forEach(stat => {
    console.log(`  ${stat.role}: ${stat._count.id} users`);
  });

  // Check date ranges for analytics
  console.log('\n📊 Date Range Analysis:');
  const oldestPayment = await prisma.payment.findFirst({ orderBy: { createdAt: 'asc' } });
  const newestPayment = await prisma.payment.findFirst({ orderBy: { createdAt: 'desc' } });
  const oldestBooking = await prisma.booking.findFirst({ orderBy: { createdAt: 'asc' } });
  const newestBooking = await prisma.booking.findFirst({ orderBy: { createdAt: 'desc' } });
  const oldestUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  const newestUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });

  console.log(`Payments: ${oldestPayment?.createdAt.toLocaleDateString()} to ${newestPayment?.createdAt.toLocaleDateString()}`);
  console.log(`Bookings: ${oldestBooking?.createdAt.toLocaleDateString()} to ${newestBooking?.createdAt.toLocaleDateString()}`);
  console.log(`Users: ${oldestUser?.createdAt.toLocaleDateString()} to ${newestUser?.createdAt.toLocaleDateString()}`);

  // Calculate total platform revenue (commission)
  const totalCommission = await prisma.payment.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { commission: true } as any,
    _count: { id: true }
  });

  console.log(`\n💰 Platform Revenue Summary:`);
  console.log(`  Total Commission: $${totalCommission._sum.commission || 0}`);
  console.log(`  Completed Payments: ${totalCommission._count.id}`);

  await prisma.$disconnect();
}

analyzeDataModels()
  .catch((e) => {
    console.error('❌ Analysis failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
