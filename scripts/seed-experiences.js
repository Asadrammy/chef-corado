const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleExperiences = [
  {
    title: "Authentic Italian Pasta Making",
    description: "Learn to make fresh pasta from scratch with traditional Italian techniques. We'll create various pasta shapes and pair them with classic sauces.",
    price: 120,
    duration: 180,
    includedServices: JSON.stringify([
      { name: "All ingredients and equipment" },
      { name: "Recipe booklet to take home" },
      { name: "Wine pairing with pasta" },
      { name: "Apron provided" }
    ]),
    eventType: "COOKING_CLASS",
    cuisineType: "ITALIAN",
    maxGuests: 8,
    minGuests: 2,
    difficulty: "MEDIUM",
    tags: JSON.stringify(["pasta", "italian", "hands-on", "wine"]),
    experienceImage: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=800",
    isActive: true
  },
  {
    title: "Sushi Masterclass Experience",
    description: "Master the art of sushi making with an experienced chef. Learn proper rice preparation, fish cutting, and rolling techniques.",
    price: 150,
    duration: 240,
    includedServices: JSON.stringify([
      { name: "Fresh sushi-grade fish" },
      { name: "Sushi making tools" },
      { name: "Miso soup and appetizers" },
      { name: "Sake tasting" }
    ]),
    eventType: "COOKING_CLASS",
    cuisineType: "ASIAN",
    maxGuests: 6,
    minGuests: 2,
    difficulty: "HARD",
    tags: JSON.stringify(["sushi", "japanese", "seafood", "advanced"]),
    experienceImage: "https://images.unsplash.com/photo-1579584446535-8b6ea8ae891a?w=800",
    isActive: true
  },
  {
    title: "Farm-to-Table Dinner Party",
    description: "Experience a unique dining experience with ingredients sourced from local farms. Multi-course meal with wine pairings and chef stories.",
    price: 200,
    duration: 240,
    includedServices: JSON.stringify([
      { name: "5-course tasting menu" },
      { name: "Wine pairings" },
      { name: "Chef interaction and stories" },
      { name: "Recipe cards" }
    ]),
    eventType: "DINNER_PARTY",
    cuisineType: "MEDITERRANEAN",
    maxGuests: 12,
    minGuests: 4,
    difficulty: "EASY",
    tags: JSON.stringify(["farm-to-table", "mediterranean", "wine", "dining"]),
    experienceImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
    isActive: true
  },
  {
    title: "Mexican Street Food Adventure",
    description: "Explore the vibrant flavors of Mexican street food. Learn to make tacos, elote, churros, and other authentic street food favorites.",
    price: 95,
    duration: 150,
    includedServices: JSON.stringify([
      { name: "All fresh ingredients" },
      { name: "Tortilla making lesson" },
      { name: "Salsa and guacamole workshop" },
      { name: "Mexican beverage pairing" }
    ]),
    eventType: "COOKING_CLASS",
    cuisineType: "MEXICAN",
    maxGuests: 10,
    minGuests: 2,
    difficulty: "EASY",
    tags: JSON.stringify(["mexican", "street-food", "tacos", "hands-on"]),
    experienceImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
    isActive: true
  },
  {
    title: "French Pastry & Desserts",
    description: "Master classic French pastries including croissants, macarons, and crème brûlée. Take home your creations and recipes.",
    price: 110,
    duration: 180,
    includedServices: JSON.stringify([
      { name: "High-quality baking ingredients" },
      { name: "Pastry tools and equipment" },
      { name: "Box for take-home pastries" },
      { name: "Coffee and tea service" }
    ]),
    eventType: "COOKING_CLASS",
    cuisineType: "FRENCH",
    maxGuests: 8,
    minGuests: 2,
    difficulty: "MEDIUM",
    tags: JSON.stringify(["french", "pastry", "desserts", "baking"]),
    experienceImage: "https://images.unsplash.com/photo-1559275146-9282b3b514c1?w=800",
    isActive: true
  },
  {
    title: "BBQ & Grilling Championship",
    description: "Learn championship BBQ techniques including smoking, grilling, and sauce making. Perfect for meat lovers and aspiring pitmasters.",
    price: 135,
    duration: 200,
    includedServices: JSON.stringify([
      { name: "Premium cuts of meat" },
      { name: "BBQ sauces and rubs" },
      { name: "Side dishes preparation" },
      { name: "Beer pairing" }
    ]),
    eventType: "COOKING_CLASS",
    cuisineType: "AMERICAN",
    maxGuests: 10,
    minGuests: 3,
    difficulty: "MEDIUM",
    tags: JSON.stringify(["bbq", "grilling", "american", "meat"]),
    experienceImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    isActive: true
  }
];

async function seedExperiences() {
  try {
    console.log('Checking for existing experiences...');
    
    // Check if experiences already exist
    const existingCount = await prisma.experience.count();
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing experiences. Skipping seed.`);
      return;
    }
    
    console.log('No existing experiences found. Seeding sample data...');
    
    // Get chef profiles to assign to experiences
    const chefs = await prisma.chefProfile.findMany({
      include: {
        user: true
      }
    });
    
    if (chefs.length === 0) {
      console.log('No chef profiles found. Please create chef accounts first.');
      return;
    }
    
    // Create experiences for each chef
    const experiences = [];
    for (let i = 0; i < sampleExperiences.length; i++) {
      const chef = chefs[i % chefs.length];
      const experienceData = {
        ...sampleExperiences[i],
        chefId: chef.id
      };
      
      const experience = await prisma.experience.create({
        data: experienceData,
        include: {
          chef: {
            include: {
              user: true
            }
          }
        }
      });
      
      experiences.push(experience);
      console.log(`Created experience: "${experience.title}" for chef ${chef.user.name}`);
    }
    
    console.log(`Successfully seeded ${experiences.length} experiences!`);
    
  } catch (error) {
    console.error('Error seeding experiences:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedExperiences();
