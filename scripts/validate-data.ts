import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateData() {
  console.log('🔍 Validating seeded data...\n');

  // Check users
  const users = await prisma.user.findMany();
  console.log(`👥 Users: ${users.length}`);
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
  });

  // Check chef profile
  const chefProfile = await prisma.chefProfile.findFirst({
    include: { user: true }
  });
  console.log(`\n👨‍🍳 Chef Profile: ${chefProfile ? 'Found' : 'Not found'}`);
  if (chefProfile) {
    console.log(`  - ${chefProfile.user.name} - ${chefProfile.location}`);
    console.log(`  - Approved: ${chefProfile.isApproved}`);
    console.log(`  - Experience: ${chefProfile.experience} years`);
  }

  // Check experiences
  const experiences = await prisma.experience.findMany({
    where: { chefId: chefProfile?.id }
  });
  console.log(`\n🍽️ Experiences: ${experiences.length}`);
  experiences.forEach(exp => {
    console.log(`  - ${exp.title} - $${exp.price}`);
  });

  // Check requests
  const requests = await prisma.request.findMany({
    include: { client: true }
  });
  console.log(`\n📋 Requests: ${requests.length}`);
  requests.forEach(req => {
    console.log(`  - ${req.title} - $${req.budget} - ${req.client.name}`);
  });

  // Check proposals
  const proposals = await prisma.proposal.findMany({
    include: { chef: { include: { user: true } }, request: true }
  });
  console.log(`\n💼 Proposals: ${proposals.length}`);
  proposals.forEach(prop => {
    console.log(`  - $${prop.price} for "${prop.request.title}" - ${prop.status}`);
  });

  // Check bookings
  const bookings = await prisma.booking.findMany({
    include: { client: true, chef: { include: { user: true } }, payments: true }
  });
  console.log(`\n📅 Bookings: ${bookings.length}`);
  bookings.forEach(booking => {
    console.log(`  - ${booking.client.name} & ${booking.chef.user.name} - $${booking.totalPrice} - ${booking.status}`);
  });

  // Check payments
  const payments = await prisma.payment.findMany({
    include: { booking: true }
  });
  console.log(`\n💳 Payments: ${payments.length}`);
  payments.forEach(payment => {
    console.log(`  - $${(payment as any).amount} - ${payment.status}`);
  });

  // Calculate total earnings for the chef
  const chefEarnings = bookings
    .filter(b => b.chefId === chefProfile?.id && b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  
  console.log(`\n💰 Chef Total Earnings: $${chefEarnings}`);

  await prisma.$disconnect();
}

validateData()
  .catch((e) => {
    console.error('❌ Validation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
