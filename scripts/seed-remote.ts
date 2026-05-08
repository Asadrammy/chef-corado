import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const REMOTE_DATABASE_URL = "postgresql://postgresql_q3ho_user:j5N4g8KZXnFxijDZcHYXWDaKbcJ3fUT4@dpg-d7kl2vho3t8c73ds4li0-a.singapore-postgres.render.com/postgresql_q3ho?connection_limit=10&pool_timeout=20&connect_timeout=10";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: REMOTE_DATABASE_URL,
    },
  },
});

// Clear database in reverse dependency order
async function clearDatabase() {
  console.log('🧹 Clearing database...');
  await prisma.ledger.deleteMany();
  try { await prisma.chefKpiSnapshot.deleteMany(); } catch {}
  await prisma.eventQueue.deleteMany();
  await prisma.slotLock.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.webhookLog.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.requestInvitation.deleteMany();
  await prisma.request.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuSection.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.chefProfile.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Database cleared\n');
}

// Seed users: 3 admins, 5 chefs, 10 clients
async function seedUsers() {
  console.log('👥 Seeding users...');
  const adminPwd = await bcrypt.hash('admin123', 10);
  const chefPwd = await bcrypt.hash('chef123', 10);
  const clientPwd = await bcrypt.hash('client123', 10);

  const admins = await Promise.all([
    prisma.user.create({ data: { name: 'Sarah Mitchell', email: 'admin@example.com', password: adminPwd, role: 'ADMIN', verified: true, profileCompletion: 100, experienceLevel: 'EXPERT' } }),
    prisma.user.create({ data: { name: 'James Wilson', email: 'james.admin@chefmarket.com', password: adminPwd, role: 'ADMIN', verified: true, profileCompletion: 100 } }),
    prisma.user.create({ data: { name: 'Emily Chen', email: 'emily.admin@chefmarket.com', password: adminPwd, role: 'ADMIN', verified: true, profileCompletion: 100 } }),
  ]);

  const chefData = [
    { name: 'John Anderson', email: 'chef@example.com', bio: 'Passionate chef with 12 years in fine dining. Italian/Mediterranean specialist using seasonal ingredients.', experience: 12, location: 'Manhattan, NY', lat: 40.7128, lng: -74.0060, radius: 50, cuisine: 'ITALIAN', type: 'PRIVATE_CHEF', cert: 'Culinary Institute of America, Sommelier', events: 8, level: 'EXPERT', img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400' },
    { name: 'Maria Santos', email: 'maria.santos@chefmarket.com', bio: 'French-trained chef blending traditional techniques with bold Asian flavors. Michelin-starred experience in Paris and Tokyo.', experience: 8, location: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442, radius: 40, cuisine: 'FRENCH', type: 'CORPORATE_CHEF', cert: 'Le Cordon Bleu Paris', events: 12, level: 'ADVANCED', img: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400' },
    { name: 'Chen Wei', email: 'chen.wei@chefmarket.com', bio: 'Asian cuisine specialist born in Shanghai, trained in Tokyo. Expert in Chinese, Japanese, Korean cooking.', experience: 15, location: 'Queens, NY', lat: 40.7282, lng: -73.7949, radius: 60, cuisine: 'ASIAN', type: 'EVENT_SPECIALIST', cert: 'Tokyo Culinary Academy, Sushi Master', events: 15, level: 'EXPERT', img: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=400' },
    { name: 'Ahmed Hassan', email: 'ahmed.hassan@chefmarket.com', bio: 'Mediterranean specialist in Middle Eastern, Greek, North African flavors. Vibrant, healthy dishes.', experience: 10, location: 'Bronx, NY', lat: 40.8448, lng: -73.8648, radius: 45, cuisine: 'MEDITERRANEAN', type: 'PRIVATE_CHEF', cert: 'CIA, Mediterranean Certificate', events: 10, level: 'ADVANCED', img: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400' },
    { name: 'Sarah Johnson', email: 'sarah.johnson@chefmarket.com', bio: 'Fusion cuisine artist breaking culinary boundaries. Combines global techniques for unexpected harmonies.', experience: 6, location: 'Staten Island, NY', lat: 40.5795, lng: -74.1502, radius: 35, cuisine: 'FUSION', type: 'EVENT_SPECIALIST', cert: 'ICE, Molecular Gastronomy', events: 6, level: 'INTERMEDIATE', img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400' },
  ];

  const chefs = await Promise.all(chefData.map((chef, i) => prisma.user.create({
    data: { name: chef.name, email: chef.email, password: chefPwd, role: 'CHEF', verified: true, profileCompletion: 100, experienceLevel: chef.level, chefProfile: { create: { bio: chef.bio, experience: chef.experience, location: chef.location, latitude: chef.lat, longitude: chef.lng, radius: chef.radius, cuisineType: chef.cuisine, chefType: chef.type, certifications: chef.cert, eventsPerMonth: chef.events, experienceLevel: chef.level, profileImage: chef.img, isApproved: true, verified: true, profileCompletion: 100, verificationStatus: i < 3 ? 'APPROVED' : i < 4 ? 'PENDING' : 'REJECTED', stripeAccountId: `acct_${chef.name.split(' ')[0].toLowerCase()}123`, stripeOnboardingComplete: true } } }
  })));

  const clientNames = ['Michael Thompson', 'Jennifer Williams', 'David Martinez', 'Lisa Anderson', 'Robert Taylor', 'Amanda Brown', 'Christopher Lee', 'Jessica Garcia', 'Daniel Rodriguez', 'Michelle Kim'];
  const clients = await Promise.all(clientNames.map((name, i) => prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@example.com`, password: clientPwd, role: 'CLIENT', verified: true, profileCompletion: 85, experienceLevel: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'][i % 3] } })));

  console.log(`✅ Created ${admins.length} admins, ${chefs.length} chefs, ${clients.length} clients\n`);
  return { admins, chefs, clients };
}

// Notification preferences
async function seedNotificationPreferences(users: any[]) {
  await prisma.notificationPreference.createMany({ data: users.map((user: any) => ({ userId: user.id, emailBookings: true, emailMessages: true, emailRequests: true, pushBookings: true, pushMessages: true, inAppBookings: true, inAppMessages: true, inAppRequests: true })) });
  console.log('✅ Notification preferences created\n');
}

// Menus with sections and items
async function seedMenus(chefProfiles: any[]) {
  const menuData = [
    { chefIdx: 0, title: 'Classic Italian Feast', desc: 'Italian menu with antipasti, pasta, mains, desserts', price: 150, cuisine: 'ITALIAN', event: 'PRIVATE_DINNER', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600', sections: [{ t: 'Antipasti', items: [{ n: 'Bruschetta Trio', d: 'Tomato basil, mushroom truffle, ricotta honey' }, { n: 'Caprese Salad', d: 'Fresh mozzarella, heirloom tomatoes' }] }, { t: 'Primi', items: [{ n: 'Fresh Pasta', d: 'Handmade tagliatelle with Bolognese' }] }] },
    { chefIdx: 1, title: 'French Elegance', desc: 'Sophisticated French cuisine with modern presentation', price: 200, cuisine: 'FRENCH', event: 'PRIVATE_DINNER', img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600', sections: [{ t: 'Hors d\'oeuvres', items: [{ n: 'Escargot', d: 'Garlic butter snails in pastry shells' }] }, { t: 'Entrées', items: [{ n: 'Coq au Vin', d: 'Braised chicken with red wine' }] }] },
    { chefIdx: 2, title: 'Asian Fusion', desc: 'Contemporary Asian dishes with international influences', price: 180, cuisine: 'ASIAN', event: 'CORPORATE_EVENT', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600', sections: [{ t: 'Appetizers', items: [{ n: 'Dim Sum Platter', d: 'Assorted steamed and fried dumplings' }] }, { t: 'Main Courses', items: [{ n: 'Wagyu Beef', d: 'A5 wagyu with truffle soy glaze' }] }] },
    { chefIdx: 3, title: 'Mediterranean Spread', desc: 'Vibrant Mediterranean flavors perfect for sharing', price: 120, cuisine: 'MEDITERRANEAN', event: 'COCKTAIL_PARTY', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', sections: [{ t: 'Mezze', items: [{ n: 'Hummus Trio', d: 'Classic, roasted red pepper, beet hummus' }] }, { t: 'Grilled', items: [{ n: 'Lamb Kofta', d: 'Spiced lamb skewers with tzatziki' }] }] },
    { chefIdx: 4, title: 'Fusion Adventure', desc: 'Unexpected flavor combinations from around the world', price: 175, cuisine: 'FUSION', event: 'PRIVATE_DINNER', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', sections: [{ t: 'Small Plates', items: [{ n: 'Taco Gyoza', d: 'Japanese dumplings with Mexican fillings' }] }, { t: 'Mains', items: [{ n: 'Kimchi Paella', d: 'Korean fermented rice with Spanish technique' }] }] },
  ];

  const menus = [];
  for (const menu of menuData) {
    const createdMenu = await prisma.menu.create({ data: { chefId: chefProfiles[menu.chefIdx].id, title: menu.title, description: menu.desc, price: menu.price, cuisineType: menu.cuisine, eventType: menu.event, menuImage: menu.img } });
    for (const section of menu.sections) {
      const createdSection = await prisma.menuSection.create({ data: { menuId: createdMenu.id, title: section.t, sortOrder: menu.sections.indexOf(section) } });
      for (const item of section.items) {
        await prisma.menuItem.create({ data: { menuSectionId: createdSection.id, name: item.n, description: item.d, sortOrder: section.items.indexOf(item) } });
      }
    }
    menus.push(createdMenu);
  }
  console.log(`✅ Created ${menus.length} menus\n`);
  return menus;
}

// Experiences
async function seedExperiences(chefProfiles: any[]) {
  const expData = [
    { chefIdx: 0, title: 'Authentic Italian Dinner Party', desc: 'Six-course Italian dinner with handmade pasta, fresh seafood, traditional desserts', price: 150, duration: 240, services: JSON.stringify(['Menu planning', 'Ingredient sourcing', 'On-site cooking', 'Plated service', 'Wine pairing', 'Cleanup']), event: 'PRIVATE_DINNER', cuisine: 'ITALIAN', max: 12, min: 4, diff: 'MEDIUM', tags: JSON.stringify(['italian', 'fine-dining', 'wine-pairing']), img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600' },
    { chefIdx: 0, title: 'Pasta Making Workshop', desc: 'Learn handmade pasta in interactive class. Master tagliatelle, ravioli, gnocchi', price: 95, duration: 180, services: JSON.stringify(['Hands-on instruction', 'All ingredients', 'Recipes', 'Wine tasting']), event: 'COOKING_CLASS', cuisine: 'ITALIAN', max: 10, min: 4, diff: 'EASY', tags: JSON.stringify(['interactive', 'class', 'pasta']), img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600' },
    { chefIdx: 1, title: 'French Haute Cuisine', desc: 'Exquisite multi-course French dinner showcasing classical techniques with modern presentations', price: 250, duration: 270, services: JSON.stringify(['Amuse-bouche', 'Multi-course tasting', 'Cheese course', 'Dessert', 'Wine pairings']), event: 'PRIVATE_DINNER', cuisine: 'FRENCH', max: 6, min: 2, diff: 'HARD', tags: JSON.stringify(['french', 'haute-cuisine', 'fine-dining']), img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600' },
    { chefIdx: 2, title: 'Asian Street Food Tour', desc: 'Vibrant Asian street market flavors at home with dishes from Japan, Thailand, Korea', price: 135, duration: 200, services: JSON.stringify(['Multiple stations', 'Interactive cooking', 'Authentic recipes']), event: 'COOKING_CLASS', cuisine: 'ASIAN', max: 12, min: 6, diff: 'EASY', tags: JSON.stringify(['asian', 'street-food', 'interactive']), img: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600' },
    { chefIdx: 2, title: 'Omakase Experience', desc: 'Chef\'s choice Japanese dining with freshest seasonal ingredients', price: 300, duration: 240, services: JSON.stringify(['Seasonal omakase menu', 'Premium ingredients', 'Traditional presentation', 'Sake pairing']), event: 'PRIVATE_DINNER', cuisine: 'ASIAN', max: 4, min: 2, diff: 'HARD', tags: JSON.stringify(['japanese', 'omakase', 'premium']), img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600' },
    { chefIdx: 3, title: 'Mediterranean Feast', desc: 'Vibrant Mediterranean feast with fresh seafood, grilled meats, colorful vegetables', price: 110, duration: 190, services: JSON.stringify(['Family-style service', 'Grilled specialties', 'Fresh salads', 'Mezze platters']), event: 'PRIVATE_DINNER', cuisine: 'MEDITERRANEAN', max: 15, min: 6, diff: 'EASY', tags: JSON.stringify(['mediterranean', 'healthy', 'family-style']), img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600' },
    { chefIdx: 4, title: 'Global Fusion Adventure', desc: 'Culinary journey combining techniques from around the world', price: 180, duration: 220, services: JSON.stringify(['Multi-continental menu', 'Fusion techniques', 'Storytelling', 'Wine pairings']), event: 'PRIVATE_DINNER', cuisine: 'FUSION', max: 10, min: 4, diff: 'MEDIUM', tags: JSON.stringify(['fusion', 'global', 'creative']), img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600' },
    { chefIdx: 4, title: 'Molecular Gastronomy', desc: 'Future of food with molecular techniques: spherification, foams, gels', price: 350, duration: 260, services: JSON.stringify(['Molecular techniques', 'Modern equipment', 'Scientific explanation']), event: 'PRIVATE_DINNER', cuisine: 'FUSION', max: 6, min: 2, diff: 'HARD', tags: JSON.stringify(['molecular', 'modern', 'innovative']), img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600' },
  ];

  await prisma.experience.createMany({ data: expData.map(exp => ({ chefId: chefProfiles[exp.chefIdx].id, title: exp.title, description: exp.desc, price: exp.price, duration: exp.duration, includedServices: exp.services, eventType: exp.event, cuisineType: exp.cuisine, maxGuests: exp.max, minGuests: exp.min, difficulty: exp.diff, tags: exp.tags, experienceImage: exp.img, isActive: true })) });
  console.log(`✅ Created ${expData.length} experiences\n`);
  return expData;
}

// Availability slots
async function seedAvailability(chefProfiles: any[]) {
  const today = new Date();
  const slots = [];
  for (const chef of chefProfiles) {
    for (let day = 1; day <= 30; day++) {
      const date = new Date(today); date.setDate(date.getDate() + day); date.setHours(0, 0, 0, 0);
      const dayOfWeek = date.getDay();
      const chefIdx = chefProfiles.indexOf(chef);
      const shouldWork = (chefIdx === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) || (chefIdx === 1) || (chefIdx === 2 && dayOfWeek >= 2 && dayOfWeek <= 6) || (chefIdx === 3 && dayOfWeek >= 1 && dayOfWeek <= 6) || (chefIdx === 4 && dayOfWeek >= 2 && dayOfWeek <= 7);
      if (shouldWork) {
        slots.push({ chefId: chef.id, date, startTime: '11:00', endTime: '15:00', isAvailable: true, maxBookings: 2, currentBookings: 0 });
        slots.push({ chefId: chef.id, date, startTime: '17:00', endTime: '23:00', isAvailable: true, maxBookings: 3, currentBookings: 0 });
      }
    }
  }
  await prisma.availability.createMany({ data: slots });
  console.log(`✅ Created ${slots.length} availability slots\n`);
  return slots;
}

// Requests
async function seedRequests(clients: any[]) {
  const today = new Date();
  const locs = [{ l: 'Manhattan, NY', lat: 40.7580, lng: -73.9855 }, { l: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442 }, { l: 'Queens, NY', lat: 40.7282, lng: -73.7949 }, { l: 'Bronx, NY', lat: 40.8448, lng: -73.8648 }, { l: 'Staten Island, NY', lat: 40.5795, lng: -74.1502 }, { l: 'Westchester, NY', lat: 41.0328, lng: -73.7628 }, { l: 'Long Island, NY', lat: 40.7927, lng: -73.1060 }, { l: 'Jersey City, NJ', lat: 40.7178, lng: -74.0431 }];
  const reqData = [
    { cIdx: 0, t: 'Anniversary Dinner for 8', d: 'Celebrating 10th wedding anniversary with close friends. Elegant Italian dinner with wine pairing.', days: 5, locIdx: 0, budget: 1200, det: 'One vegetarian guest. Romantic ambiance with candlelight.' },
    { cIdx: 1, t: 'Corporate Team Building Event', d: 'Interactive cooking experience for sales team of 15. Foster collaboration and team spirit.', days: 10, locIdx: 1, budget: 3000, det: 'Team building focus, mixed dietary preferences, alcohol included.' },
    { cIdx: 2, t: 'Birthday Surprise Dinner', d: 'Surprise 30th birthday party. Mediterranean feast with variety and festive atmosphere.', days: 7, locIdx: 2, budget: 800, det: 'Gluten-free options needed, festive atmosphere, birthday cake.' },
    { cIdx: 3, t: 'Executive Board Meeting Lunch', d: 'High-end lunch for 6 executives. Impressive presentation and exceptional service.', days: 3, locIdx: 0, budget: 1500, det: 'Business formal, dietary: 2 vegan, 1 gluten-free.' },
    { cIdx: 4, t: 'Holiday Family Gathering', d: 'Family reunion with 12 adults and 6 kids. Family-style service with kid-friendly options.', days: 14, locIdx: 5, budget: 2000, det: 'Casual atmosphere, mix of adult and children menus, dessert buffet.' },
    { cIdx: 5, t: 'Romantic Date Night Proposal', d: 'Planning to propose. Intimate setting with French cuisine, flowers, perfect ambiance.', days: 2, locIdx: 0, budget: 400, det: 'Romantic setup, flowers, quiet atmosphere, special moment.' },
    { cIdx: 6, t: 'Product Launch Celebration', d: 'Product launch party for 25 guests. Impressive hors d\'oeuvres and signature cocktails.', days: 20, locIdx: 0, budget: 3500, det: 'Standing reception, cocktail party style, dietary restrictions.' },
    { cIdx: 7, t: 'Graduation Celebration Dinner', d: 'College graduation celebration for family and friends. Festive atmosphere.', days: 25, locIdx: 0, budget: 1800, det: 'Mixed ages, celebratory mood, photo opportunities.' },
    { cIdx: 8, t: 'Wedding Rehearsal Dinner', d: 'Wedding rehearsal dinner for 30 guests. Elegant but not overly formal.', days: 18, locIdx: 6, budget: 2500, det: 'Wedding theme integration, toast time, cake cutting rehearsal.' },
    { cIdx: 9, t: 'Bridal Shower Brunch', d: 'Elegant bridal shower brunch for 12 guests. Sophisticated but fun with champagne.', days: 12, locIdx: 0, budget: 900, det: 'Bridal theme, champagne toast, elegant presentation.' },
    { cIdx: 0, t: 'Networking Event for Tech Startup', d: 'Casual networking event for 40 tech professionals. Easy-to-eat finger foods and drinks.', days: 15, locIdx: 7, budget: 2200, det: 'Standing cocktail style, tech-savvy presentation, dietary variety.' },
    { cIdx: 1, t: 'Retirement Party', d: 'Retirement party for colleague of 25 years. Celebration with nostalgic touches.', days: 22, locIdx: 1, budget: 1600, det: 'Celebratory, traditional dishes, toast opportunities.' },
    { cIdx: 2, t: 'Cooking Class for Friends', d: 'Learn cooking with 8 friends. Interactive class with hands-on participation.', days: 8, locIdx: 3, budget: 700, det: 'Hands-on class, fun atmosphere, recipes to take home.' },
    { cIdx: 3, t: 'Dinner Party for New Neighbors', d: 'Hosting dinner to meet new neighbors. Approachable, impressive but not intimidating.', days: 6, locIdx: 4, budget: 600, det: 'Approachable cuisine, good for conversation, moderate budget.' },
    { cIdx: 4, t: 'Milestone Birthday Celebration', d: '50th birthday celebration for 20 guests. Memorable experience with exceptional food.', days: 28, locIdx: 7, budget: 2800, det: 'Milestone celebration, impressive presentation, memorable.' },
    { cIdx: 5, t: 'Casual Weekend Gathering', d: 'Casual weekend dinner with 6 friends. Relaxed atmosphere with great food.', days: 4, locIdx: 0, budget: 500, det: 'Relaxed, casual but quality food, good for conversation.' },
    { cIdx: 6, t: 'Client Appreciation Dinner', d: 'Dinner to thank key clients. Impress while maintaining professional atmosphere.', days: 11, locIdx: 0, budget: 1300, det: 'Professional but warm, impressive but approachable.' },
    { cIdx: 7, t: 'Housewarming Party', d: 'New house celebration with 15 guests. Food that works for mingling and conversation.', days: 9, locIdx: 2, budget: 1100, det: 'Housewarming theme, easy-to-eat, good for mingling.' },
    { cIdx: 8, t: 'Date Night Cooking Class', d: 'Romantic cooking class for couples. Intimate, fun atmosphere.', days: 13, locIdx: 0, budget: 350, det: 'Couples-focused, romantic but fun, hands-on.' },
    { cIdx: 9, t: 'Farewell Dinner', d: 'Farewell dinner for colleague moving away. Sentimental, warm atmosphere.', days: 16, locIdx: 1, budget: 750, det: 'Sentimental, warm atmosphere, toast opportunities.' },
    { cIdx: 0, t: 'Kids Birthday Party', d: 'Birthday party for 10 kids ages 8-12. Fun, kid-friendly interactive cooking.', days: 19, locIdx: 2, budget: 550, det: 'Kid-friendly, fun, interactive, allergy-aware.' },
    { cIdx: 1, t: 'Wine Tasting Dinner', d: 'Wine tasting dinner for 8 wine enthusiasts. Food that pairs with wine selection.', days: 23, locIdx: 0, budget: 1400, det: 'Wine-focused food pairings, sophisticated but approachable.' },
    { cIdx: 2, t: 'Healthy Meal Prep Workshop', d: 'Workshop for 6 people focused on healthy meal prep. Educational, practical.', days: 26, locIdx: 3, budget: 400, det: 'Health-focused, educational, practical takeaways.' },
    { cIdx: 3, t: 'Elegant Dinner Party', d: 'Elegant dinner party for 10 guests. Sophisticated multi-course meal.', days: 17, locIdx: 0, budget: 1700, det: 'Elegant, multi-course, sophisticated presentation.' },
    { cIdx: 4, t: 'Casual Brunch Gathering', d: 'Casual brunch for 12 friends. Relaxed atmosphere with variety.', days: 21, locIdx: 1, budget: 650, det: 'Casual brunch, variety, relaxed atmosphere.' },
    { cIdx: 5, t: 'Intimate Dinner for Two', d: 'Romantic anniversary dinner for 2. French cuisine with wine pairing.', days: 3, locIdx: 0, budget: 500, det: 'Romantic setting, French cuisine, wine pairing.' },
    { cIdx: 6, t: 'Summer BBQ Party', d: 'Summer BBQ for 20 guests. Grilled favorites and seasonal sides.', days: 30, locIdx: 3, budget: 1200, det: 'BBQ theme, grilled items, outdoor setup.' },
    { cIdx: 7, t: 'Cocktail Party Reception', d: 'Elegant cocktail party for 30 guests. Sophisticated hors d\'oeuvres.', days: 8, locIdx: 0, budget: 1800, det: 'Cocktail style, elegant presentation, standing reception.' },
    { cIdx: 8, t: 'Family Sunday Roast', d: 'Traditional Sunday roast for 8 family members. Comfort food focus.', days: 4, locIdx: 2, budget: 400, det: 'Traditional comfort food, family-style service.' },
    { cIdx: 9, t: 'Vegan Dinner Party', d: 'Fully vegan dinner for 10 guests. Creative plant-based cuisine.', days: 12, locIdx: 4, budget: 700, det: 'All vegan, creative plant-based dishes.' },
    { cIdx: 0, t: 'Seafood Feast', d: 'Seafood-focused dinner for 12 guests. Fresh catch preparation.', days: 15, locIdx: 1, budget: 1600, det: 'Seafood focus, fresh preparation, variety.' },
    { cIdx: 1, t: 'Dessert-Only Party', d: 'Dessert party for 15 guests. Sweet creations and coffee bar.', days: 6, locIdx: 0, budget: 450, det: 'Dessert focus, coffee bar, sweet creations.' },
    { cIdx: 2, t: 'Tapas Night', d: 'Spanish tapas dinner for 8 guests. Variety of small plates.', days: 9, locIdx: 0, budget: 550, det: 'Spanish cuisine, tapas style, variety.' },
    { cIdx: 3, t: 'Comfort Food Gathering', d: 'Comfort food dinner for 10 friends. Hearty, satisfying dishes.', days: 7, locIdx: 5, budget: 600, det: 'Comfort food focus, hearty dishes.' },
    { cIdx: 4, t: 'Asian Fusion Dinner', d: 'Asian fusion cuisine for 12 guests. Creative blend of flavors.', days: 18, locIdx: 2, budget: 1100, det: 'Asian fusion, creative flavor combinations.' },
    { cIdx: 5, t: 'Mexican Fiesta', d: 'Mexican-themed dinner for 15 guests. Festive atmosphere with margaritas.', days: 11, locIdx: 3, budget: 900, det: 'Mexican theme, festive, margaritas.' },
    { cIdx: 6, t: 'Italian Family Dinner', d: 'Traditional Italian family dinner for 14 guests. Multi-course meal.', days: 14, locIdx: 1, budget: 1300, det: 'Italian family-style, multi-course.' },
    { cIdx: 7, t: 'Healthy Catered Lunch', d: 'Healthy lunch for office of 20. Nutritious and delicious.', days: 5, locIdx: 0, budget: 800, det: 'Health-focused, office lunch, nutritious.' },
    { cIdx: 8, t: 'Gourmet Burger Night', d: 'Gourmet burger dinner for 10 friends. Elevated comfort food.', days: 8, locIdx: 4, budget: 500, det: 'Gourmet burgers, elevated comfort food.' },
    { cIdx: 9, t: 'Charcuterie & Wine Night', d: 'Charcuterie board dinner for 8. Wine pairing focus.', days: 10, locIdx: 0, budget: 450, det: 'Charcuterie focus, wine pairing.' },
  ];

  const requests = await prisma.request.createMany({ data: reqData.map(req => { const loc = locs[req.locIdx]; const eventDate = new Date(today); eventDate.setDate(eventDate.getDate() + req.days); return { clientId: clients[req.cIdx].id, title: req.t, description: req.d, eventType: 'Other', eventDate, location: loc.l, latitude: loc.lat, longitude: loc.lng, guestCount: 10, budget: req.budget, details: req.det }; }) as any });
  console.log(`✅ Created ${reqData.length} requests\n`);
  return reqData;
}

// Proposals
async function seedProposals(reqData: any[], chefProfiles: any[], menus: any[]) {
  const allRequests = await prisma.request.findMany({ orderBy: { createdAt: 'asc' } });
  const propData = [];
  const usedCombinations = new Set();
  
  for (let i = 0; i < 30; i++) {
    const reqIndex = i % allRequests.length;
    const chefIndex = Math.floor(i / allRequests.length) % chefProfiles.length;
    const combination = `${chefProfiles[chefIndex].id}-${allRequests[reqIndex].id}`;
    
    if (usedCombinations.has(combination)) continue;
    usedCombinations.add(combination);
    
    const req = allRequests[reqIndex];
    const chef = chefProfiles[chefIndex];
    const price = Math.round(req.budget * (0.85 + Math.random() * 0.3));
    const statusRoll = Math.random();
    const status = statusRoll < 0.35 ? 'PENDING' : statusRoll < 0.55 ? 'ACCEPTED_PENDING_PAYMENT' : statusRoll < 0.75 ? 'REJECTED' : 'COMPLETED';
    const msgs = ['I would be honored to cater your event! Based on your requirements, I can create a customized menu.', 'This sounds like a wonderful event! I have extensive experience with this type of gathering.', 'I\'m excited about the opportunity to work with you on this event. My approach focuses on creating memorable experiences.', 'Your event aligns perfectly with my culinary style. I can create a menu that will delight your guests.', 'I\'d love to bring my passion for food to your event. With my experience and attention to detail, I can ensure everything is perfect.'];
    propData.push({ requestId: req.id, chefId: chef.id, price, message: msgs[i % msgs.length], status, menuId: (status === 'ACCEPTED_PENDING_PAYMENT' || status === 'COMPLETED') ? menus[i % menus.length]?.id : null, expiresAt: status === 'PENDING' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null });
  }
  await prisma.proposal.createMany({ data: propData });
  console.log(`✅ Created ${propData.length} proposals\n`);
  return propData;
}

// Request Invitations
async function seedRequestInvitations(requests: any[], chefProfiles: any[]) {
  const invitations = [];
  const allRequests = await prisma.request.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < 10; i++) {
    const request = allRequests[i % allRequests.length];
    const chef = chefProfiles[i % chefProfiles.length];
    // Check if this chef already has a proposal for this request
    const existingProposal = await prisma.proposal.findFirst({
      where: { requestId: request.id, chefId: chef.id }
    });
    if (!existingProposal) {
      const invitation = await prisma.requestInvitation.create({
        data: {
          requestId: request.id,
          chefId: chef.id,
          status: i < 7 ? 'PENDING' : i < 9 ? 'ACCEPTED' : 'DECLINED'
        }
      });
      invitations.push(invitation);
    }
  }
  console.log(`✅ Created ${invitations.length} request invitations\n`);
  return invitations;
}

// Bookings
async function seedBookings(clients: any[], chefProfiles: any[], propData: any[], expData: any[]) {
  const allProposals = await prisma.proposal.findMany({ where: { status: { in: ['ACCEPTED_PENDING_PAYMENT', 'ACCEPTED', 'COMPLETED'] } } });
  const allExperiences = await prisma.experience.findMany({ where: { isActive: true } });
  const today = new Date();

  const proposalBookings = await Promise.all(allProposals.map(async (prop) => {
    const req = await prisma.request.findUnique({ where: { id: prop.requestId } });
    const isCompleted = prop.status === 'COMPLETED';
    return prisma.booking.create({ data: { clientId: req!.clientId, chefId: prop.chefId, proposalId: prop.id, eventDate: isCompleted ? new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000) : req!.eventDate, location: req!.location, latitude: req!.latitude, longitude: req!.longitude, guestCount: Math.floor(4 + Math.random() * 20), totalPrice: prop.price, bookingType: 'PROPOSAL', status: isCompleted ? 'COMPLETED' : Math.random() > 0.3 ? 'CONFIRMED' : 'PENDING', specialRequests: req!.details, createdAt: isCompleted ? new Date(today.getTime() - Math.random() * 35 * 24 * 60 * 60 * 1000) : new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) } });
  }));

  const instantBookings = [];
  for (let i = 0; i < 8; i++) {
    const exp = allExperiences[i % allExperiences.length];
    const eventDate = new Date(today); eventDate.setDate(eventDate.getDate() + 10 + i * 3);
    const booking = await prisma.booking.create({ data: { clientId: clients[i % clients.length].id, chefId: chefProfiles[i % chefProfiles.length].id, experienceId: exp.id, eventDate, location: chefProfiles[i % chefProfiles.length].location, latitude: chefProfiles[i % chefProfiles.length].latitude, longitude: chefProfiles[i % chefProfiles.length].longitude, guestCount: Math.floor((exp.minGuests || 2) + Math.random() * ((exp.maxGuests || 10) - (exp.minGuests || 2))), totalPrice: exp.price * Math.floor(2 + Math.random() * 6), bookingType: 'INSTANT', status: i < 3 ? 'COMPLETED' : i < 6 ? 'CONFIRMED' : 'PENDING', specialRequests: 'Looking forward to this experience!', createdAt: new Date(today.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000) } });
    instantBookings.push(booking);
  }

  const cancelledBookings = await Promise.all([
    prisma.booking.create({ data: { clientId: clients[0].id, chefId: chefProfiles[0].id, eventDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), location: 'Manhattan, NY', latitude: 40.7580, longitude: -73.9855, guestCount: 8, totalPrice: 1200, bookingType: 'PROPOSAL', status: 'CANCELLED', specialRequests: 'Had to cancel due to scheduling conflict', createdAt: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000) } }),
    prisma.booking.create({ data: { clientId: clients[1].id, chefId: chefProfiles[1].id, eventDate: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000), location: 'Brooklyn, NY', latitude: 40.6782, longitude: -73.9442, guestCount: 12, totalPrice: 1800, bookingType: 'INSTANT', status: 'CANCELLED', specialRequests: 'Client had emergency', createdAt: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000) } }),
  ]);

  const allBookings = [...proposalBookings, ...instantBookings, ...cancelledBookings];
  console.log(`✅ Created ${allBookings.length} bookings\n`);
  return allBookings;
}

// Payments
async function seedPayments(bookings: any[]) {
  const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');
  const confirmedBookings = bookings.filter((b: any) => b.status === 'CONFIRMED');
  const cancelledBookings = bookings.filter((b: any) => b.status === 'CANCELLED');
  const payments = [];

  for (const booking of completedBookings) {
    const payment = await prisma.payment.create({ data: { bookingId: booking.id, totalAmount: booking.totalPrice, commissionAmount: booking.totalPrice * 0.15, chefAmount: booking.totalPrice * 0.85, status: Math.random() > 0.3 ? 'COMPLETED' : 'RELEASED', stripePaymentIntentId: `pi_${booking.id.slice(0, 8)}_${Date.now()}`, stripeChargeId: `ch_${booking.id.slice(0, 8)}_${Date.now()}`, releasedAt: new Date(booking.createdAt.getTime() + 24 * 60 * 60 * 1000), releasedBy: 'system' } });
    payments.push(payment);
  }

  for (const booking of confirmedBookings) {
    const payment = await prisma.payment.create({ data: { bookingId: booking.id, totalAmount: booking.totalPrice, commissionAmount: booking.totalPrice * 0.15, chefAmount: booking.totalPrice * 0.85, status: 'HELD', stripePaymentIntentId: `pi_${booking.id.slice(0, 8)}_${Date.now()}` } });
    payments.push(payment);
  }

  // Create payments for cancelled bookings so refunds can be generated
  for (const booking of cancelledBookings) {
    const payment = await prisma.payment.create({ data: { bookingId: booking.id, totalAmount: booking.totalPrice, commissionAmount: booking.totalPrice * 0.15, chefAmount: booking.totalPrice * 0.85, status: 'REFUNDED', stripePaymentIntentId: `pi_${booking.id.slice(0, 8)}_${Date.now()}`, stripeChargeId: `ch_${booking.id.slice(0, 8)}_${Date.now()}` } });
    payments.push(payment);
  }

  console.log(`✅ Created ${payments.length} payments\n`);
  return payments;
}

// Payouts
async function seedPayouts(chefProfiles: any[], payments: any[]) {
  const releasedPayments = payments.filter((p: any) => p.status === 'RELEASED' || p.status === 'COMPLETED');
  const payouts = [];

  for (const chef of chefProfiles) {
    const payoutCount = Math.floor(1 + Math.random() * 2);
    for (let i = 0; i < payoutCount; i++) {
      const payout = await prisma.payout.create({ data: { chefId: chef.id, amount: Math.round(500 + Math.random() * 1500), status: i === 0 ? 'COMPLETED' : 'PENDING', stripeTransferId: `tr_${chef.id.slice(0, 8)}_${i}_${Date.now()}`, processedAt: i === 0 ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : null, processedBy: i === 0 ? 'admin@example.com' : null, idempotencyKey: `payout_${chef.id}_${i}_${Date.now()}` } });
      payouts.push(payout);
    }
  }

  console.log(`✅ Created ${payouts.length} payouts\n`);
  return payouts;
}

// Reviews
async function seedReviews(completedBookings: any[]) {
  const comments = ['Absolutely incredible experience! The chef was professional, the food was exceptional, and every detail was perfect.', 'Exceeded all expectations! The chef created a memorable evening with delicious food and impeccable service.', 'Amazing from start to finish. The chef was accommodating of all dietary restrictions and the presentation was beautiful.', 'Professional, talented, and genuinely passionate about their craft. The food was restaurant-quality.', 'A truly exceptional dining experience. The chef\'s attention to detail and culinary expertise made our celebration unforgettable.', 'Outstanding in every way. The chef was flexible, creative, and delivered beyond what we imagined.', 'Perfect execution of a complex menu. The chef handled everything seamlessly and the guests were all impressed.', 'Could not have asked for a better experience. The chef was personable, skilled, and the food was absolutely delicious.', 'Transformed our event into something truly special. The chef\'s creativity and professionalism were remarkable.', 'An absolute pleasure to work with. The chef brought vision and expertise that elevated our celebration.'];
  const reviews = [];
  for (let i = 0; i < completedBookings.length; i++) {
    const booking = completedBookings[i];
    const review = await prisma.review.create({ data: { rating: Math.min(Math.floor(4 + Math.random() * 2), 5), comment: comments[i % comments.length], clientId: booking.clientId, chefId: booking.chefId, bookingId: booking.id } });
    reviews.push(review);
  }
  console.log(`✅ Created ${reviews.length} reviews\n`);
  return reviews;
}

// Messages
async function seedMessages(users: any[], bookings: any[]) {
  const msgs = ['Hi! I saw your request and would love to discuss it further.', 'Thank you for your interest! When would be a good time to chat?', 'I have some questions about the dietary requirements.', 'Could you tell me more about the venue setup?', 'What\'s your budget flexibility like?', 'I\'m excited about this event! Let me know if you need any adjustments.', 'Looking forward to working with you on this!', 'Just checking in - do you have any questions about my proposal?', 'The menu looks great! Can we make a small adjustment?', 'Perfect, I\'ll send over the final details shortly.'];
  const chefs = users.filter((u: any) => u.role === 'CHEF');
  const clients = users.filter((u: any) => u.role === 'CLIENT');
  const messages = [];

  for (let i = 0; i < 15; i++) {
    const chef = chefs[i % chefs.length];
    const client = clients[i % clients.length];
    const threadLength = Math.floor(2 + Math.random() * 6);
    for (let j = 0; j < threadLength; j++) {
      const sender = j % 2 === 0 ? chef : client;
      const receiver = j % 2 === 0 ? client : chef;
      const message = await prisma.message.create({ data: { senderId: sender.id, receiverId: receiver.id, content: msgs[(i + j) % msgs.length], isRead: j < threadLength - 1, bookingId: bookings[i % bookings.length]?.id } });
      messages.push(message);
    }
  }

  const admin = users.find((u: any) => u.role === 'ADMIN');
  for (let i = 0; i < 5; i++) {
    await prisma.message.create({ data: { senderId: admin!.id, receiverId: chefs[i % chefs.length].id, content: 'Your profile has been approved. You can now start receiving requests!', isRead: true } });
    messages.push({ count: 1 });
  }

  console.log(`✅ Created ${messages.length} messages\n`);
  return messages;
}

// Notifications
async function seedNotifications(users: any[]) {
  const types = ['REQUEST_RECEIVED', 'PROPOSAL_SENT', 'BOOKING_CONFIRMED', 'BOOKING_COMPLETED', 'PAYMENT_RECEIVED', 'REVIEW_RECEIVED', 'MESSAGE_RECEIVED'];
  const msgs = ['You have a new request in your area!', 'Your proposal has been sent to the client.', 'Your booking has been confirmed.', 'Your booking has been completed successfully.', 'Payment has been received for your booking.', 'You received a new review from a client.', 'You have a new message in your inbox.'];
  const notifications = [];
  for (let i = 0; i < 40; i++) {
    const notification = await prisma.notification.create({ data: { userId: users[i % users.length].id, type: types[i % types.length], message: msgs[i % msgs.length], isRead: Math.random() > 0.4 } });
    notifications.push(notification);
  }
  console.log(`✅ Created ${notifications.length} notifications\n`);
  return notifications;
}

// Disputes
async function seedDisputes(bookings: any[]) {
  const disputes = [];
  const reasons = ['SERVICE_QUALITY', 'PAYMENT_ISSUE', 'COMMUNICATION', 'CANCELLATION', 'DAMAGES', 'TIMING'];
  const descriptions = [
    'Client felt the service did not meet expectations.',
    'Disagreement over payment amount and refund policy.',
    'Miscommunication about event timing and setup.',
    'Client cancelled late and chef wants compensation.',
    'Some equipment was damaged during the event.',
    'Chef arrived late and setup was rushed.'
  ];
  for (let i = 0; i < 12; i++) {
    const booking = bookings[i % bookings.length];
    const dispute = await prisma.dispute.create({ data: { bookingId: booking.id, reason: reasons[i % reasons.length], description: descriptions[i % descriptions.length], status: i < 4 ? 'RESOLVED' : i < 8 ? 'IN_PROGRESS' : 'OPEN', initiatedBy: i % 2 === 0 ? 'CLIENT' : 'CHEF', evidence: 'Photos and email correspondence available.', resolvedBy: i < 4 ? 'admin@example.com' : null, resolution: i < 4 ? (i % 2 === 0 ? 'Partial refund issued to client.' : 'Full refund issued to client.') : null, resolvedAt: i < 4 ? new Date(Date.now() - (5 + i) * 24 * 60 * 60 * 1000) : null } });
    disputes.push(dispute);
  }
  console.log(`✅ Created ${disputes.length} disputes\n`);
  return disputes;
}

// Audit logs
async function seedAuditLogs(admins: any[]) {
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];
  const entityTypes = ['USER', 'BOOKING', 'PAYMENT', 'CHEF_PROFILE', 'PROPOSAL'];
  for (let i = 0; i < 25; i++) {
    await prisma.auditLog.create({ data: { action: actions[i % actions.length], entityType: entityTypes[i % entityTypes.length], entityId: `entity_${i}`, newValue: JSON.stringify({ status: 'updated', value: i }), performedBy: admins[i % admins.length].id, reason: i % 3 === 0 ? 'User request' : i % 3 === 1 ? 'System update' : 'Quality assurance', ipAddress: `192.168.1.${100 + i}`, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  }
  console.log('✅ Created 25 audit logs\n');
}

// Ledger entries
async function seedLedgerEntries(payments: any[], payouts: any[], refunds: any[]) {
  for (const payment of payments) {
    await prisma.ledger.create({ data: { transactionType: 'PAYMENT_RECEIVED', amount: payment.totalAmount, currency: 'USD', description: 'Payment received for booking', bookingId: payment.bookingId, paymentId: payment.id, fromAccount: 'CLIENT', toAccount: 'PLATFORM', createdBy: 'system' } });
  }
  for (const payout of payouts) {
    await prisma.ledger.create({ data: { transactionType: 'PAYOUT_PROCESSED', amount: -payout.amount, currency: 'USD', description: 'Payout processed to chef', payoutId: payout.id, fromAccount: 'PLATFORM', toAccount: 'CHEF', createdBy: 'admin@example.com' } });
  }
  for (const refund of refunds) {
    await prisma.ledger.create({ data: { transactionType: 'REFUND_PROCESSED', amount: -refund.amount, currency: 'USD', description: 'Refund processed to client', refundId: refund.id, fromAccount: 'PLATFORM', toAccount: 'CLIENT', createdBy: 'admin@example.com' } });
  }
  console.log(`✅ Created ledger entries\n`);
}

// KPI snapshots
async function seedKpiSnapshots(chefProfiles: any[]) {
  try {
    const today = new Date();
    for (const chef of chefProfiles) {
      for (let day = 14; day >= 0; day--) {
        const date = new Date(today); date.setDate(date.getDate() - day); date.setHours(0, 0, 0, 0);
        await prisma.chefKpiSnapshot.create({ data: { chefId: chef.id, date } });
      }
    }
    console.log(`✅ Created KPI snapshots for ${chefProfiles.length} chefs\n`);
  } catch (error) {
    console.log('⚠️  KPI snapshots table not available, skipping...\n');
  }
}

// Refunds
async function seedRefunds(bookings: any[], payments: any[]) {
  const refunds = [];
  const refundedPayments = payments.filter((p: any) => p.status === 'REFUNDED');
  const reasons = ['SERVICE_NOT_DELIVERED', 'CLIENT_REQUEST', 'MISCOMMUNICATION', 'QUALITY_ISSUE', 'SCHEDULING_CONFLICT', 'OTHER', 'DAMAGES', 'LATE_ARRIVAL'];
  const descriptions = [
    'Service was not delivered as agreed',
    'Client requested cancellation due to personal reasons',
    'Miscommunication about event details',
    'Quality did not meet expectations',
    'Scheduling conflict could not be resolved',
    'Other circumstances',
    'Equipment was damaged during event',
    'Chef arrived late to the venue'
  ];
  
  for (let i = 0; i < Math.min(12, refundedPayments.length); i++) {
    const payment = refundedPayments[i];
    
    if (payment) {
      const refundAmount = payment.totalAmount * (0.5 + Math.random() * 0.4); // 50-90% refund
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: refundAmount,
          reason: reasons[i % reasons.length],
          description: descriptions[i % descriptions.length],
          status: i % 2 === 0 ? 'COMPLETED' : 'PENDING',
          processedBy: i % 2 === 0 ? 'admin@example.com' : null,
          processedAt: i % 2 === 0 ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
          stripeRefundId: `re_${payment.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          idempotencyKey: `refund_${payment.id}_${Date.now()}`,
        }
      });
      refunds.push(refund);
    }
  }
  
  console.log(`✅ Created ${refunds.length} refunds\n`);
  return refunds;
}

// Webhook logs
async function seedWebhookLogs(payments: any[]) {
  const eventTypes = ['payment_intent.succeeded', 'payment_intent.failed', 'charge.succeeded', 'payout.created'];
  for (let i = 0; i < 15; i++) {
    const payment = payments[i % payments.length];
    await prisma.webhookLog.create({ data: { stripeEventId: `evt_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, eventType: eventTypes[i % eventTypes.length], payload: JSON.stringify({ paymentId: payment.id, amount: payment.totalAmount }), status: i % 5 === 0 ? 'FAILED' : 'PROCESSED', processedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), errorMessage: i % 5 === 0 ? 'Timeout error' : null, retryCount: i % 5 === 0 ? 3 : 0 } });
  }
  console.log('✅ Created 15 webhook logs\n');
}

// Event queue
async function seedEventQueue() {
  const eventTypes = ['SEND_NOTIFICATION', 'PROCESS_PAYOUT', 'UPDATE_KPI', 'SEND_EMAIL'];
  for (let i = 0; i < 10; i++) {
    const status = i < 7 ? 'COMPLETED' : i < 9 ? 'PENDING' : 'FAILED';
    await prisma.eventQueue.create({ data: { eventType: eventTypes[i % eventTypes.length], payload: JSON.stringify({ id: i, data: `payload_${i}` }), status, priority: i % 3, retryCount: status === 'FAILED' ? 3 : 0, maxRetries: 3, processedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null, nextRetryAt: status === 'PENDING' || status === 'FAILED' ? new Date(Date.now() + 3600000) : null, errorMessage: status === 'FAILED' ? 'Temporary error' : null } });
  }
  console.log('✅ Created 10 event queue items\n');
}

// MAIN
async function main() {
  console.log('🚀 Starting PRODUCTION seed...\n');
  const startTime = Date.now();

  try {
    await clearDatabase();
    const { admins, chefs, clients } = await seedUsers();
    const chefProfiles = await prisma.chefProfile.findMany();
    const allUsers = [...admins, ...chefs, ...clients];

    await seedNotificationPreferences(allUsers);
    const menus = await seedMenus(chefProfiles);
    const experiences = await seedExperiences(chefProfiles);
    await seedAvailability(chefProfiles);
    const requestData = await seedRequests(clients);
    const proposalData = await seedProposals(requestData, chefProfiles, menus);
    await seedRequestInvitations(requestData, chefProfiles);
    const bookings = await seedBookings(clients, chefProfiles, proposalData, experiences);
    const payments = await seedPayments(bookings);
    const payouts = await seedPayouts(chefProfiles, payments);
    const refunds = await seedRefunds(bookings, payments);
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
    await seedReviews(completedBookings);
    await seedMessages(allUsers, bookings);
    await seedNotifications(allUsers);
    await seedDisputes(bookings);
    await seedAuditLogs(admins);
    await seedLedgerEntries(payments, payouts, refunds);
    await seedKpiSnapshots(chefProfiles);
    await seedWebhookLogs(payments);
    await seedEventQueue();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRODUCTION SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s\n`);
    console.log('📊 SUMMARY:');
    console.log(`👥 Users: ${allUsers.length} (3 admins, 5 chefs, 10 clients)`);
    console.log(`📋 Menus: ${menus.length}`);
    console.log(`🍳 Experiences: ${experiences.length}`);
    console.log(`📅 Availability: Created for all chefs (30 days)`);
    console.log(`📋 Requests: ${requestData.length}`);
    console.log(`💼 Proposals: ${proposalData.length}`);
    console.log(`� Request Invitations: Seeded`);
    console.log(`�� Bookings: ${bookings.length}`);
    console.log(`💰 Payments: ${payments.length}`);
    console.log(`💸 Payouts: ${payouts.length}`);
    console.log(`↩️  Refunds: ${refunds.length}`);
    console.log(`⭐ Reviews: ${completedBookings.length}`);
    console.log(`💬 Messages: Seeded`);
    console.log(`🔔 Notifications: Seeded`);
    console.log(`⚖️  Disputes: Seeded`);
    console.log(`📝 Audit logs: 25`);
    console.log(`📒 Ledger entries: Seeded`);
    console.log(`📊 KPI snapshots: ${chefProfiles.length * 15}`);
    console.log(`🔗 Webhook logs: 15`);
    console.log(`📋 Event queue: 10\n`);
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Chef: chef@example.com / chef123');
    console.log('Client: michael.t@example.com / client123 (or any client email)\n');
    console.log('🎉 System is now fully seeded with realistic production data!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
