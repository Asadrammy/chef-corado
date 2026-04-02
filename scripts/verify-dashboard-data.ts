import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDashboardData() {
  console.log('🔍 Verifying dashboard data...\n');

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
  console.log(`📍 Chef location: ${chef.chefProfile.latitude}, ${chef.chefProfile.longitude}`);
  console.log(`📏 Service radius: ${chef.chefProfile.radius} miles`);

  // Get bookings
  const bookings = await prisma.booking.findMany({
    where: { chefId: chef.chefProfile.id },
    include: { payments: true }
  });

  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED').length;
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;

  console.log(`📅 Active Bookings: ${activeBookings}`);
  console.log(`✅ Completed Bookings: ${completedBookings}`);

  // Calculate earnings
  const totalEarnings = bookings
    .filter(b => b.status === 'COMPLETED' && b.payments?.status === 'COMPLETED')
    .reduce((sum, booking) => sum + (booking.payments?.chefAmount || 0), 0);

  console.log(`💰 Total Earnings: $${totalEarnings.toFixed(2)}`);

  // Get requests
  const requests = await prisma.request.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      eventDate: { gte: new Date() }
    }
  });

  // Filter by chef radius (using proper distance calculation)
  const availableRequests = requests.filter(request => {
    if (!chef.chefProfile?.latitude || !chef.chefProfile?.longitude || !request.latitude || !request.longitude) {
      return false;
    }
    
    // Simple distance calculation in degrees (rough approximation)
    const distance = Math.sqrt(
      Math.pow(request.latitude - chef.chefProfile.latitude, 2) + 
      Math.pow(request.longitude - chef.chefProfile.longitude, 2)
    );
    
    // Convert to approximate miles (1 degree ≈ 69 miles)
    const distanceInMiles = distance * 69;
    
    console.log(`Request "${request.title.substring(0, 20)}..." - Distance: ${distanceInMiles.toFixed(2)} miles (Radius: ${chef.chefProfile.radius} miles)`);
    
    return distanceInMiles <= chef.chefProfile.radius;
  });

  console.log(`📋 Available Requests: ${availableRequests.length}`);

  // Get reviews and calculate rating
  const reviews = await prisma.review.findMany({
    where: { chefId: chef.chefProfile.id }
  });

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  console.log(`⭐ Average Rating: ${averageRating.toFixed(1)}`);

  console.log('\n🎉 DASHBOARD DATA VERIFICATION COMPLETE!');
  console.log('\nThe dashboard should now show:');
  console.log(`- Earnings: $${totalEarnings.toFixed(2)}`);
  console.log(`- Active Bookings: ${activeBookings}`);
  console.log(`- Completed Bookings: ${completedBookings}`);
  console.log(`- Available Requests: ${availableRequests.length}`);
  console.log(`- Average Rating: ${averageRating.toFixed(1)}`);
}

verifyDashboardData()
  .catch((e) => {
    console.error('❌ Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
