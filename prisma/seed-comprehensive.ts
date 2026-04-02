import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.request.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.chefProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      verified: true,
    },
  });

  // Create chef user with fully completed profile
  const chefPassword = await bcrypt.hash('chef123', 10);
  const chef = await prisma.user.create({
    data: {
      name: 'John Anderson',
      email: 'chef@example.com',
      password: chefPassword,
      role: 'CHEF',
      verified: true,
      profileCompletion: 100,
      experienceLevel: 'EXPERT',
      chefProfile: {
        create: {
          bio: 'I am a passionate chef with over 12 years of experience in fine dining and private catering. I specialize in Italian and Mediterranean cuisine, using only the freshest seasonal ingredients. My philosophy is to create memorable dining experiences that bring people together through food.',
          experience: 12,
          location: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 50,
          isApproved: true,
          verified: true,
          profileCompletion: 100,
          experienceLevel: 'EXPERT',
          cuisineType: 'ITALIAN',
          profileImage: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face',
        },
      },
    },
  });

  // Create multiple client users
  const clientData = [
    { name: 'Sarah Johnson', email: 'sarah.j@example.com' },
    { name: 'Michael Chen', email: 'michael.c@example.com' },
    { name: 'Emily Rodriguez', email: 'emily.r@example.com' },
    { name: 'David Thompson', email: 'david.t@example.com' },
    { name: 'Lisa Williams', email: 'lisa.w@example.com' },
  ];

  const clients = await Promise.all(
    clientData.map(async (client) => {
      const password = await bcrypt.hash('client123', 10);
      return prisma.user.create({
        data: {
          name: client.name,
          email: client.email,
          password,
          role: 'CLIENT',
          verified: true,
          profileCompletion: 85,
        },
      });
    })
  );

  // Get chef profile
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: chef.id },
  });

  if (!chefProfile) {
    throw new Error('Chef profile not found after seeding');
  }

  // Create comprehensive experiences for the chef
  const experiences = await prisma.experience.createMany({
    data: [
      {
        title: 'Authentic Italian Dinner Party',
        description: 'A six-course authentic Italian dinner featuring handmade pasta, fresh seafood, and traditional desserts. Perfect for intimate gatherings and special celebrations.',
        price: 150,
        duration: 240,
        includedServices: JSON.stringify(['Menu planning', 'Ingredient sourcing', 'On-site cooking', 'Plated service', 'Wine pairing', 'Cleanup']),
        eventType: 'PRIVATE_DINNER',
        cuisineType: 'ITALIAN',
        maxGuests: 12,
        minGuests: 4,
        difficulty: 'MEDIUM',
        tags: JSON.stringify(['italian', 'fine-dining', 'wine-pairing', 'authentic']),
        experienceImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop',
        chefId: chefProfile.id,
        isActive: true,
      },
      {
        title: 'Mediterranean Mezze Experience',
        description: 'Interactive Mediterranean feast with homemade hummus, grilled meats, and fresh salads. Guests can participate in cooking demonstrations.',
        price: 95,
        duration: 180,
        includedServices: JSON.stringify(['Cooking demonstration', 'All ingredients', 'Family-style service', 'Recipes to take home']),
        eventType: 'COOKING_CLASS',
        cuisineType: 'MEDITERRANEAN',
        maxGuests: 20,
        minGuests: 8,
        difficulty: 'EASY',
        tags: JSON.stringify(['interactive', 'mediterranean', 'healthy', 'group-friendly']),
        experienceImage: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop',
        chefId: chefProfile.id,
        isActive: true,
      },
      {
        title: 'Corporate Team Building Culinary Challenge',
        description: 'Hands-on cooking competition where teams work together to create a gourmet meal. Perfect for corporate team building and morale boosting.',
        price: 180,
        duration: 300,
        includedServices: JSON.stringify(['Team cooking stations', 'Competition format', 'Judging', 'Awards', 'Full meal service']),
        eventType: 'TEAM_BUILDING',
        cuisineType: 'INTERNATIONAL',
        maxGuests: 40,
        minGuests: 12,
        difficulty: 'HARD',
        tags: JSON.stringify(['corporate', 'team-building', 'competition', 'interactive']),
        experienceImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
        chefId: chefProfile.id,
        isActive: true,
      },
      {
        title: 'Romantic Dinner for Two',
        description: 'Intimate three-course dinner perfect for anniversaries, proposals, or special date nights. Includes romantic ambiance setup.',
        price: 200,
        duration: 150,
        includedServices: JSON.stringify(['Romantic table setup', 'Floral arrangements', 'Background music', 'Personalized menu', 'Dessert plating']),
        eventType: 'ROMANTIC_DINNER',
        cuisineType: 'FRENCH',
        maxGuests: 2,
        minGuests: 2,
        difficulty: 'MEDIUM',
        tags: JSON.stringify(['romantic', 'intimate', 'special-occasion', 'french-cuisine']),
        experienceImage: 'https://images.unsplash.com/photo-1553979459-2229431be8ec?w=600&h=400&fit=crop',
        chefId: chefProfile.id,
        isActive: true,
      },
    ],
  });

  // Create availability slots for the chef (next 30 days)
  const today = new Date();
  const availabilityDates = [];
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    
    // Skip some random days to show realistic availability
    if (i % 3 !== 0) {
      availabilityDates.push(date);
    }
  }

  await prisma.availability.createMany({
    data: availabilityDates.map((date) => ({
      chefId: chefProfile.id,
      date,
      startTime: '17:00',
      endTime: '23:00',
      isAvailable: true,
      recurringPattern: null,
      maxBookings: 2,
      currentBookings: 0,
    })),
  });

  // Create realistic client requests
  const requests = await prisma.request.createMany({
    data: [
      {
        clientId: clients[0].id, // Sarah Johnson
        title: 'Anniversary Dinner for 8 People',
        description: 'Celebrating our 10th wedding anniversary with close friends. Want an elegant Italian dinner with wine pairing.',
        eventDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        location: 'Manhattan, New York',
        latitude: 40.7580,
        longitude: -73.9855,
        budget: 1200,
        details: 'One vegetarian guest needed. Prefer romantic ambiance.',
      },
      {
        clientId: clients[1].id, // Michael Chen
        title: 'Corporate Team Building Event',
        description: 'Looking for an interactive cooking experience for our sales team of 15 people. Want to foster collaboration.',
        eventDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        location: 'Brooklyn, New York',
        latitude: 40.6782,
        longitude: -73.9442,
        budget: 3000,
        details: 'Team building focus, mixed dietary preferences, alcohol included.',
      },
      {
        clientId: clients[2].id, // Emily Rodriguez
        title: 'Birthday Surprise Dinner',
        description: 'Surprise 30th birthday party for my sister. Want a Mediterranean feast with lots of variety.',
        eventDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: 'Queens, New York',
        latitude: 40.7282,
        longitude: -73.7949,
        budget: 800,
        details: 'Gluten-free options needed, festive atmosphere preferred.',
      },
      {
        clientId: clients[3].id, // David Thompson
        title: 'Executive Board Meeting Lunch',
        description: 'High-end lunch for 6 executives. Need impressive presentation and exceptional service.',
        eventDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        location: 'Manhattan, New York',
        latitude: 40.7614,
        longitude: -73.9776,
        budget: 1500,
        details: 'Business formal setting, dietary restrictions: 2 vegan, 1 gluten-free.',
      },
      {
        clientId: clients[4].id, // Lisa Williams
        title: 'Holiday Family Gathering',
        description: 'Family reunion with 12 adults and 6 kids. Need family-style service with kid-friendly options.',
        eventDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        location: 'Westchester, New York',
        latitude: 41.0328,
        longitude: -73.7628,
        budget: 2000,
        details: 'Casual atmosphere, mix of adult and children menus, dessert buffet.',
      },
      {
        clientId: clients[0].id, // Sarah Johnson (another request)
        title: 'Romantic Date Night',
        description: 'Special date night proposal. Want intimate setting with French cuisine.',
        eventDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        location: 'Manhattan, New York',
        latitude: 40.7260,
        longitude: -73.9897,
        budget: 400,
        details: 'Romantic setup, flowers, quiet atmosphere preferred.',
      },
      {
        clientId: clients[1].id, // Michael Chen (another request)
        title: 'Product Launch Celebration',
        description: 'Company product launch party for 25 guests. Need impressive hors d\'oeuvres and signature cocktails.',
        eventDate: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        location: 'SoHo, New York',
        latitude: 40.7233,
        longitude: -74.0030,
        budget: 3500,
        details: 'Standing reception, cocktail party style, dietary restrictions noted.',
      },
      {
        clientId: clients[2].id, // Emily Rodriguez (another request)
        title: 'Graduation Celebration Dinner',
        description: 'College graduation celebration for family and friends. Want festive atmosphere.',
        eventDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        location: 'Upper East Side, New York',
        latitude: 40.7736,
        longitude: -73.9566,
        budget: 1800,
        details: 'Mixed ages, celebratory mood, photo opportunities desired.',
      },
    ],
  });

  // Fetch created requests for proposal creation
  const allRequests = await prisma.request.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Create proposals from chef for some requests (realistic acceptance rates)
  const proposalData = [
    { requestIdIndex: 0, price: 1100, status: 'ACCEPTED', message: 'I would be honored to cater your anniversary celebration! I\'ll create a special six-course Italian menu with seasonal ingredients and perfect wine pairings.' },
    { requestIdIndex: 1, price: 2800, status: 'ACCEPTED', message: 'Perfect for team building! I\'ll design an interactive culinary competition that will bring your sales team together through friendly competition and delicious food.' },
    { requestIdIndex: 2, price: 750, status: 'PENDING', message: 'I love birthday celebrations! I\'ll create a vibrant Mediterranean spread with plenty of gluten-free options and festive desserts.' },
    { requestIdIndex: 3, price: 1400, status: 'ACCEPTED', message: 'For your executive lunch, I\'ll prepare an impressive three-course menu with elegant presentation and accommodate all dietary restrictions seamlessly.' },
    { requestIdIndex: 4, price: 1900, status: 'PENDING', message: 'Family gatherings are special! I\'ll design a menu that appeals to both adults and children, with plenty of options for everyone.' },
    { requestIdIndex: 5, price: 380, status: 'COMPLETED', message: 'I\'ll create the perfect romantic atmosphere with French cuisine, beautiful presentation, and attention to every detail for your special proposal.' },
    { requestIdIndex: 6, price: 3200, status: 'PENDING', message: 'Product launches deserve exceptional food! I\'ll create impressive hors d\'oeuvres and signature cocktails that will wow your guests.' },
  ];

  const proposals = await Promise.all(
    proposalData.map(async (data, index) => {
      return prisma.proposal.create({
        data: {
          requestId: allRequests[data.requestIdIndex].id,
          chefId: chefProfile.id,
          price: data.price,
          message: data.message,
          status: data.status,
        },
      });
    })
  );

  // Create bookings from accepted proposals
  const acceptedProposals = proposals.filter(p => p.status === 'ACCEPTED');
  const completedProposal = proposals.find(p => p.status === 'COMPLETED');

  const bookings = await Promise.all([
    // Historical bookings for realistic earnings trend
    // January 2026 - Starting small
    prisma.booking.create({
      data: {
        clientId: clients[0].id,
        chefId: chefProfile.id,
        eventDate: new Date('2026-01-15'),
        location: "Manhattan, NY",
        guestCount: 2,
        totalPrice: 280,
        bookingType: 'INSTANT',
        status: 'COMPLETED',
        specialRequests: "Anniversary dinner - quiet table preferred",
        createdAt: new Date('2026-01-10'),
      },
    }),
    // February 2026 - Growth phase
    prisma.booking.create({
      data: {
        clientId: clients[1].id,
        chefId: chefProfile.id,
        eventDate: new Date('2026-02-08'),
        location: "Brooklyn, NY",
        guestCount: 4,
        totalPrice: 450,
        bookingType: 'INSTANT',
        status: 'COMPLETED',
        specialRequests: "Birthday celebration for 4 people",
        createdAt: new Date('2026-02-03'),
      },
    }),
    prisma.booking.create({
      data: {
        clientId: clients[2].id,
        chefId: chefProfile.id,
        eventDate: new Date('2026-02-22'),
        location: "Queens, NY",
        guestCount: 3,
        totalPrice: 380,
        bookingType: 'INSTANT',
        status: 'COMPLETED',
        specialRequests: "Business dinner - professional atmosphere",
        createdAt: new Date('2026-02-18'),
      },
    }),
    // March 2026 - Continued growth
    prisma.booking.create({
      data: {
        clientId: clients[0].id,
        chefId: chefProfile.id,
        eventDate: new Date('2026-03-12'),
        location: "Manhattan, NY",
        guestCount: 6,
        totalPrice: 650,
        bookingType: 'INSTANT',
        status: 'COMPLETED',
        specialRequests: "Corporate team building event",
        createdAt: new Date('2026-03-08'),
      },
    }),
    ...acceptedProposals.map(async (proposal, index) => {
      const request = allRequests.find(r => r.id === proposal.requestId);
      return prisma.booking.create({
        data: {
          clientId: request!.clientId,
          chefId: chefProfile.id,
          proposalId: proposal.id,
          eventDate: request!.eventDate,
          location: request!.location,
          latitude: request!.latitude,
          longitude: request!.longitude,
          guestCount: index === 0 ? 8 : index === 1 ? 15 : 6, // Vary guest counts
          totalPrice: proposal.price,
          bookingType: 'PROPOSAL',
          status: index === 0 ? 'COMPLETED' : 'CONFIRMED', // Mix of completed and upcoming
          specialRequests: request!.details,
        },
      });
    }),
    // Create a booking from the completed proposal
    completedProposal ? prisma.booking.create({
      data: {
        clientId: allRequests[5].clientId,
        chefId: chefProfile.id,
        proposalId: completedProposal.id,
        eventDate: allRequests[5].eventDate,
        location: allRequests[5].location,
        latitude: allRequests[5].latitude,
        longitude: allRequests[5].longitude,
        guestCount: 2,
        totalPrice: completedProposal.price,
        bookingType: 'PROPOSAL',
        status: 'COMPLETED',
        specialRequests: allRequests[5].details,
      },
    }) : null,
  ].filter(Boolean));

  // Create payments for completed bookings
  const completedBookings = bookings.filter((b): b is NonNullable<typeof b> => b !== null && b.status === 'COMPLETED');
  await Promise.all(
    completedBookings.map(async (booking) => {
      return prisma.payment.create({
        data: {
          bookingId: booking.id,
          totalAmount: booking.totalPrice,
          commissionAmount: booking.totalPrice * 0.15, // 15% commission
          chefAmount: booking.totalPrice * 0.85, // 85% to chef
          status: 'RELEASED',
        } as any,
      });
    })
  );

  // Create reviews for completed bookings
  await Promise.all(
    completedBookings.map(async (booking, index) => {
      return prisma.review.create({
        data: {
          rating: index === 0 ? 5 : 4, // Mix of ratings
          comment: index === 0 
            ? 'Absolutely incredible experience! John created the perfect anniversary dinner. Every course was exceptional and the service was impeccable.'
            : 'Amazing romantic dinner proposal! The food was exquisite and the atmosphere was perfect. Highly recommend!',
          clientId: booking.clientId,
          chefId: chefProfile.id,
          bookingId: booking.id,
        },
      });
    })
  );

  // Create some instant bookings for variety
  const instantBookingExperience = await prisma.experience.findFirst({
    where: { chefId: chefProfile.id },
  });

  if (instantBookingExperience) {
    await prisma.booking.create({
      data: {
        clientId: clients[3].id, // David Thompson
        chefId: chefProfile.id,
        experienceId: instantBookingExperience.id,
        eventDate: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
        location: 'Manhattan, New York',
        latitude: 40.7580,
        longitude: -73.9855,
        guestCount: 4,
        totalPrice: instantBookingExperience.price * 4,
        bookingType: 'INSTANT',
        status: 'CONFIRMED',
        specialRequests: 'Celebrating a promotion, want something special',
      },
    });
  }

  console.log('✅ Comprehensive seed completed successfully!');
  console.log(`👥 Created ${clients.length} clients`);
  console.log(`📋 Created ${allRequests.length} requests`);
  console.log(`💼 Created ${proposals.length} proposals`);
  console.log(`📅 Created ${bookings.length} bookings`);
  console.log(`💰 Created ${completedBookings.length} completed bookings with payments`);
  console.log(`⭐ Created reviews for completed bookings`);
  console.log(`🍳 Created 4 chef experiences`);
  console.log(`📅 Created ${availabilityDates.length} availability slots`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
