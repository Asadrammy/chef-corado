const fs = require("fs");
const bcrypt = require("bcrypt");
const {
  PgClient,
  qident,
  literal,
  objectSummary,
  tableColumns,
  tableCount,
  insertRowsJson,
} = require("./render-pg-direct-migrate.cjs");

const databaseUrl = process.env.DESTINATION_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DESTINATION_DATABASE_URL or DATABASE_URL is required.");
  process.exit(1);
}

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date();

function makeId(prefix, index) {
  return `${prefix}_${String(index).padStart(4, "0")}`;
}

function addDays(days) {
  return new Date(now.getTime() + days * dayMs);
}

function pastDays(days) {
  return new Date(now.getTime() - days * dayMs);
}

async function insertRows(client, tableName, rows) {
  if (!rows.length) return 0;
  const tableColumnOrder = await tableColumns(client, tableName);
  const rowKeys = new Set(rows.flatMap((row) => Object.keys(row)));
  const columns = tableColumnOrder.filter((column) => rowKeys.has(column));
  await insertRowsJson(client, tableName, columns, JSON.stringify(rows));
  return rows.length;
}

async function resetSchema(client, ddl) {
  await client.query('drop schema if exists "public" cascade; create schema "public";');
  await client.query(ddl);
}

async function seed(client) {
  const adminPwd = await bcrypt.hash("admin123", 10);
  const chefPwd = await bcrypt.hash("chef123", 10);
  const clientPwd = await bcrypt.hash("client123", 10);

  const admins = [
    { id: makeId("user_admin", 1), name: "Sarah Mitchell", email: "admin@example.com", adminRole: "SUPER_ADMIN" },
    { id: makeId("user_admin", 2), name: "James Wilson", email: "james.admin@chefmarket.com", adminRole: "OPERATIONS_COMPLIANCE_MANAGER" },
    { id: makeId("user_admin", 3), name: "Emily Chen", email: "emily.admin@chefmarket.com", adminRole: "CUSTOMER_SUPPORT_SPECIALIST" },
  ].map((user) => ({
    ...user,
    password: adminPwd,
    role: "ADMIN",
    isBanned: false,
    verified: true,
    profileCompletion: 100,
    experienceLevel: "EXPERT",
    termsAcceptedAt: now,
    termsVersion: "2026-04",
    acceptedVia: "register",
    createdAt: now,
    updatedAt: now,
  }));

  const chefSeed = [
    ["John Anderson", "chef@example.com", "ITALIAN", "PRIVATE_CHEF", "Manhattan, NY", 40.7128, -74.0060, 12, "EXPERT"],
    ["Maria Santos", "maria.santos@chefmarket.com", "FRENCH", "CORPORATE_CHEF", "Brooklyn, NY", 40.6782, -73.9442, 8, "ADVANCED"],
    ["Chen Wei", "chen.wei@chefmarket.com", "ASIAN", "EVENT_SPECIALIST", "Queens, NY", 40.7282, -73.7949, 15, "EXPERT"],
    ["Ahmed Hassan", "ahmed.hassan@chefmarket.com", "MEDITERRANEAN", "PRIVATE_CHEF", "Bronx, NY", 40.8448, -73.8648, 10, "ADVANCED"],
    ["Sarah Johnson", "sarah.johnson@chefmarket.com", "FUSION", "EVENT_SPECIALIST", "Staten Island, NY", 40.5795, -74.1502, 6, "INTERMEDIATE"],
  ];

  const chefs = chefSeed.map(([name, email, cuisine, chefType, location, latitude, longitude, experience, level], index) => ({
    id: index === 0 ? "cmph911b10001byd5xgn4e5o1" : makeId("user_chef", index + 1),
    name,
    email,
    password: chefPwd,
    role: "CHEF",
    isBanned: false,
    verified: true,
    profileCompletion: 100,
    experienceLevel: level,
    termsAcceptedAt: now,
    termsVersion: "2026-04",
    acceptedVia: "register",
    createdAt: now,
    updatedAt: now,
    cuisine,
    chefType,
    location,
    latitude,
    longitude,
    experience,
  }));

  const clientNames = [
    "Michael Thompson",
    "Jennifer Williams",
    "David Martinez",
    "Lisa Anderson",
    "Robert Taylor",
    "Amanda Brown",
    "Christopher Lee",
    "Jessica Garcia",
    "Daniel Rodriguez",
    "Michelle Kim",
  ];

  const clients = clientNames.map((name, index) => ({
    id: makeId("user_client", index + 1),
    name,
    email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@example.com`,
    password: clientPwd,
    role: "CLIENT",
    isBanned: false,
    verified: true,
    profileCompletion: 85,
    experienceLevel: ["BEGINNER", "INTERMEDIATE", "ADVANCED"][index % 3],
    termsAcceptedAt: now,
    termsVersion: "2026-04",
    acceptedVia: "register",
    createdAt: now,
    updatedAt: now,
  }));

  await insertRows(client, "User", [...admins, ...chefs.map(({ cuisine, chefType, location, latitude, longitude, experience, ...user }) => user), ...clients]);

  const chefProfiles = chefs.map((chef, index) => ({
    id: makeId("chef_profile", index + 1),
    userId: chef.id,
    location: chef.location,
    latitude: chef.latitude,
    longitude: chef.longitude,
    radius: [50, 40, 60, 45, 35][index],
    baseCountryCode: "GB",
    preferredCurrency: "GBP",
    bio: `${chef.name} is a highly rated ${chef.cuisine.toLowerCase()} chef with ${chef.experience} years of private dining experience.`,
    specialties: chef.cuisine,
    cuisineTypes: chef.cuisine,
    priceRange: index < 2 ? "PREMIUM" : "MID_RANGE",
    isApproved: true,
    isBanned: false,
    profileCompletion: 100,
    verificationStatus: index < 3 ? "APPROVED" : index === 3 ? "PENDING" : "REJECTED",
    certifications: index === 1 ? "Le Cordon Bleu Paris" : "Culinary certification",
    chefType: chef.chefType,
    cuisineType: chef.cuisine,
    eventsPerMonth: [8, 12, 15, 10, 6][index],
    experience: chef.experience,
    experienceLevel: chef.experienceLevel,
    profileImage: [
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400",
      "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400",
      "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=400",
      "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400",
      "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400",
    ][index],
    stripeAccountId: `acct_${chef.name.split(" ")[0].toLowerCase()}123`,
    stripeOnboardingComplete: true,
    verified: true,
    rightToWorkUkConfirmed: false,
    foodHygieneLevel2Confirmed: false,
    approvedAt: index < 3 ? now : null,
    approvedBy: index < 3 ? admins[0].id : null,
    insuranceStatus: "pending",
    createdAt: now,
    updatedAt: now,
  }));
  await insertRows(client, "ChefProfile", chefProfiles);

  await insertRows(client, "NotificationPreference", [...admins, ...chefs, ...clients].map((user, index) => ({
    id: makeId("notification_pref", index + 1),
    userId: user.id,
    emailMessages: true,
    emailBookings: true,
    emailRequests: true,
    pushMessages: true,
    pushBookings: true,
    inAppMessages: true,
    inAppBookings: true,
    inAppRequests: true,
    createdAt: now,
    updatedAt: now,
  })));

  const menus = [
    ["Classic Italian Feast", "Italian menu with antipasti, pasta, mains, desserts", 150, "ITALIAN", "PRIVATE_DINNER"],
    ["French Elegance", "Sophisticated French cuisine with modern presentation", 200, "FRENCH", "PRIVATE_DINNER"],
    ["Asian Fusion", "Contemporary Asian dishes with international influences", 180, "ASIAN", "CORPORATE_EVENT"],
    ["Mediterranean Spread", "Vibrant Mediterranean flavors perfect for sharing", 120, "MEDITERRANEAN", "COCKTAIL_PARTY"],
    ["Fusion Adventure", "Unexpected flavor combinations from around the world", 175, "FUSION", "PRIVATE_DINNER"],
  ].map(([title, description, price, cuisineType, eventType], index) => ({
    id: makeId("menu", index + 1),
    chefId: chefProfiles[index].id,
    title,
    description,
    price,
    currency: "GBP",
    menuType: "FREE_FORM",
    menuImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
    cuisineType,
    eventType,
    createdAt: now,
    updatedAt: now,
  }));
  await insertRows(client, "Menu", menus);

  const experiences = [
    [0, "Authentic Italian Dinner Party", 150, "ITALIAN", "PRIVATE_DINNER", 12, 4, "MEDIUM"],
    [0, "Pasta Making Workshop", 95, "ITALIAN", "COOKING_CLASS", 10, 4, "EASY"],
    [1, "French Haute Cuisine", 250, "FRENCH", "PRIVATE_DINNER", 6, 2, "HARD"],
    [2, "Asian Street Food Tour", 135, "ASIAN", "COOKING_CLASS", 12, 6, "EASY"],
    [2, "Omakase Experience", 300, "ASIAN", "PRIVATE_DINNER", 4, 2, "HARD"],
    [3, "Mediterranean Feast", 110, "MEDITERRANEAN", "PRIVATE_DINNER", 15, 6, "EASY"],
    [4, "Global Fusion Adventure", 180, "FUSION", "PRIVATE_DINNER", 10, 4, "MEDIUM"],
    [4, "Molecular Gastronomy", 350, "FUSION", "PRIVATE_DINNER", 6, 2, "HARD"],
  ].map(([chefIndex, title, price, cuisineType, eventType, maxGuests, minGuests, difficulty], index) => ({
    id: makeId("experience", index + 1),
    title,
    description: `${title} with personalized menu planning and polished service.`,
    price,
    currency: "GBP",
    duration: 180 + index * 10,
    includedServices: JSON.stringify(["Menu planning", "Ingredient sourcing", "On-site cooking", "Cleanup"]),
    eventType,
    cuisineType,
    maxGuests,
    minGuests,
    serviceType: "DINING",
    offersCookingClasses: eventType === "COOKING_CLASS",
    difficulty,
    tags: JSON.stringify([String(cuisineType).toLowerCase(), String(eventType).toLowerCase()]),
    experienceImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
    chefId: chefProfiles[chefIndex].id,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  await insertRows(client, "Experience", experiences);

  const availability = [];
  for (const [chefIndex, chef] of chefProfiles.entries()) {
    for (let day = 1; day <= 30; day += 1) {
      const date = addDays(day);
      date.setHours(0, 0, 0, 0);
      const dow = date.getDay();
      const works = (chefIndex === 0 && dow >= 1 && dow <= 5) ||
        chefIndex === 1 ||
        (chefIndex === 2 && dow >= 2 && dow <= 6) ||
        (chefIndex === 3 && dow >= 1 && dow <= 6) ||
        (chefIndex === 4 && dow >= 2 && dow <= 6);
      if (works) {
        availability.push({ id: makeId("availability", availability.length + 1), chefId: chef.id, date, startTime: "11:00", endTime: "15:00", isAvailable: true, maxBookings: 2, currentBookings: 0, createdAt: now, updatedAt: now });
        availability.push({ id: makeId("availability", availability.length + 1), chefId: chef.id, date, startTime: "17:00", endTime: "23:00", isAvailable: true, maxBookings: 3, currentBookings: 0, createdAt: now, updatedAt: now });
      }
    }
  }
  await insertRows(client, "Availability", availability);

  const locations = [
    ["Manhattan, NY", 40.7580, -73.9855],
    ["Brooklyn, NY", 40.6782, -73.9442],
    ["Queens, NY", 40.7282, -73.7949],
    ["Bronx, NY", 40.8448, -73.8648],
    ["Staten Island, NY", 40.5795, -74.1502],
    ["Westchester, NY", 41.0328, -73.7628],
    ["Long Island, NY", 40.7927, -73.1060],
    ["Jersey City, NJ", 40.7178, -74.0431],
  ];
  const requestTitles = [
    "Anniversary Dinner for 8", "Corporate Team Building Event", "Birthday Surprise Dinner", "Executive Board Meeting Lunch", "Holiday Family Gathering",
    "Romantic Date Night Proposal", "Product Launch Celebration", "Graduation Celebration Dinner", "Wedding Rehearsal Dinner", "Bridal Shower Brunch",
    "Networking Event for Tech Startup", "Retirement Party", "Cooking Class for Friends", "Dinner Party for New Neighbors", "Milestone Birthday Celebration",
    "Casual Weekend Gathering", "Client Appreciation Dinner", "Housewarming Party", "Date Night Cooking Class", "Farewell Dinner",
    "Kids Birthday Party", "Wine Tasting Dinner", "Healthy Meal Prep Workshop", "Elegant Dinner Party", "Casual Brunch Gathering",
    "Intimate Dinner for Two", "Summer BBQ Party", "Cocktail Party Reception", "Family Sunday Roast", "Vegan Dinner Party",
    "Seafood Feast", "Dessert-Only Party", "Tapas Night", "Comfort Food Gathering", "Asian Fusion Dinner",
    "Mexican Fiesta", "Italian Family Dinner", "Healthy Catered Lunch", "Gourmet Burger Night", "Charcuterie & Wine Night",
  ];
  const requests = requestTitles.map((title, index) => {
    const loc = locations[index % locations.length];
    return {
      id: makeId("request", index + 1),
      clientId: clients[index % clients.length].id,
      title,
      eventType: index % 4 === 0 ? "PRIVATE_DINNER" : "Other",
      cuisineTypes: index % 3 === 0 ? "ITALIAN" : null,
      dietaryRequirements: index % 5 === 0 ? "Vegetarian option requested" : null,
      description: `${title} requiring a professional chef and polished service.`,
      eventDate: addDays(2 + index),
      eventTime: "19:00",
      location: loc[0],
      countryCode: "GB",
      currency: "GBP",
      guestCount: 6 + (index % 20),
      latitude: loc[1],
      longitude: loc[2],
      budget: 350 + index * 75,
      details: "Client requested a reliable private dining experience.",
      createdAt: pastDays(index % 10),
    };
  });
  await insertRows(client, "Request", requests);

  const proposalStatuses = [
    ...Array(10).fill("PENDING"),
    ...Array(6).fill("ACCEPTED_PENDING_PAYMENT"),
    ...Array(7).fill("REJECTED"),
    ...Array(7).fill("COMPLETED"),
  ];
  const proposals = proposalStatuses.map((status, index) => ({
    id: makeId("proposal", index + 1),
    requestId: requests[index].id,
    chefId: chefProfiles[0].id,
    menuId: ["ACCEPTED_PENDING_PAYMENT", "COMPLETED"].includes(status) ? menus[index % menus.length].id : null,
    price: Math.round(requests[index].budget * (0.9 + (index % 5) * 0.04)),
    currency: "GBP",
    message: "I would be honored to cater your event with a customized menu.",
    status,
    expiresAt: status === "PENDING" ? addDays(7) : null,
    createdAt: pastDays(index % 7),
    updatedAt: now,
  }));
  await insertRows(client, "Proposal", proposals);

  const invitations = [];
  for (let index = 0; index < 10; index += 1) {
    const chef = chefProfiles[index % chefProfiles.length];
    const request = requests[index];
    const hasProposal = proposals.some((proposal) => proposal.requestId === request.id && proposal.chefId === chef.id);
    if (!hasProposal) {
      invitations.push({
        id: makeId("request_invitation", invitations.length + 1),
        requestId: request.id,
        chefId: chef.id,
        status: index < 7 ? "PENDING" : index < 9 ? "ACCEPTED" : "DECLINED",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await insertRows(client, "RequestInvitation", invitations);

  const bookings = [];
  for (const proposal of proposals.filter((proposal) => ["ACCEPTED_PENDING_PAYMENT", "COMPLETED"].includes(proposal.status))) {
    const request = requests.find((item) => item.id === proposal.requestId);
    bookings.push({
      id: makeId("booking", bookings.length + 1),
      clientId: request.clientId,
      chefId: proposal.chefId,
      proposalId: proposal.id,
      eventDate: proposal.status === "COMPLETED" ? pastDays(10 + bookings.length) : request.eventDate,
      location: request.location,
      latitude: request.latitude,
      longitude: request.longitude,
      guestCount: request.guestCount,
      totalPrice: proposal.price,
      currency: "GBP",
      bookingType: "PROPOSAL",
      status: proposal.status === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
      specialRequests: request.details,
      version: 1,
      createdAt: pastDays(bookings.length + 1),
      updatedAt: now,
    });
  }
  for (let index = 0; index < 8; index += 1) {
    const experience = experiences[index % experiences.length];
    bookings.push({
      id: makeId("booking", bookings.length + 1),
      clientId: clients[index % clients.length].id,
      chefId: experience.chefId,
      experienceId: experience.id,
      eventDate: addDays(10 + index * 3),
      location: chefProfiles[index % chefProfiles.length].location,
      latitude: chefProfiles[index % chefProfiles.length].latitude,
      longitude: chefProfiles[index % chefProfiles.length].longitude,
      guestCount: 4 + index,
      totalPrice: experience.price * (2 + (index % 4)),
      currency: "GBP",
      bookingType: "INSTANT",
      status: index < 3 ? "COMPLETED" : index < 6 ? "CONFIRMED" : "PENDING",
      specialRequests: "Looking forward to this experience!",
      version: 1,
      createdAt: pastDays(index + 1),
      updatedAt: now,
    });
  }
  bookings.push({
    id: makeId("booking", bookings.length + 1),
    clientId: clients[0].id,
    chefId: chefProfiles[0].id,
    eventDate: pastDays(5),
    location: "Manhattan, NY",
    latitude: 40.7580,
    longitude: -73.9855,
    guestCount: 8,
    totalPrice: 1200,
    currency: "GBP",
    bookingType: "PROPOSAL",
    status: "CANCELLED",
    specialRequests: "Had to cancel due to scheduling conflict",
    version: 1,
    createdAt: pastDays(15),
    updatedAt: now,
  });
  bookings.push({
    id: makeId("booking", bookings.length + 1),
    clientId: clients[1].id,
    chefId: chefProfiles[1].id,
    eventDate: pastDays(8),
    location: "Brooklyn, NY",
    latitude: 40.6782,
    longitude: -73.9442,
    guestCount: 12,
    totalPrice: 1800,
    currency: "GBP",
    bookingType: "INSTANT",
    status: "CANCELLED",
    specialRequests: "Client had emergency",
    version: 1,
    createdAt: pastDays(18),
    updatedAt: now,
  });
  await insertRows(client, "Booking", bookings);

  const payments = [];
  for (const booking of bookings.filter((booking) => ["COMPLETED", "CONFIRMED", "CANCELLED"].includes(booking.status))) {
    const refunded = booking.status === "CANCELLED";
    payments.push({
      id: makeId("payment", payments.length + 1),
      bookingId: booking.id,
      totalAmount: booking.totalPrice,
      commissionAmount: booking.totalPrice * 0.15,
      chefAmount: booking.totalPrice * 0.85,
      currency: "GBP",
      status: refunded ? "REFUNDED" : booking.status === "COMPLETED" ? (payments.length % 2 ? "RELEASED" : "COMPLETED") : "HELD",
      stripePaymentIntentId: `pi_${booking.id}`,
      stripeChargeId: booking.status === "COMPLETED" || refunded ? `ch_${booking.id}` : null,
      releasedAt: booking.status === "COMPLETED" ? now : null,
      releasedBy: booking.status === "COMPLETED" ? "system" : null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }
  await insertRows(client, "Payment", payments);

  const payouts = chefProfiles.map((chef, index) => ({
    id: makeId("payout", index + 1),
    chefId: chef.id,
    amount: 500 + index * 250,
    status: index % 2 === 0 ? "COMPLETED" : "PENDING",
    stripeTransferId: `tr_${chef.id}`,
    processedAt: index % 2 === 0 ? pastDays(index + 1) : null,
    processedBy: index % 2 === 0 ? admins[0].id : null,
    idempotencyKey: `payout_${chef.id}`,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }));
  await insertRows(client, "Payout", payouts);

  const refunds = payments.filter((payment) => payment.status === "REFUNDED").map((payment, index) => ({
    id: makeId("refund", index + 1),
    paymentId: payment.id,
    amount: payment.totalAmount * 0.75,
    reason: index % 2 ? "CLIENT_REQUEST" : "SCHEDULING_CONFLICT",
    description: "Refund generated for cancelled booking.",
    status: index % 2 ? "PENDING" : "COMPLETED",
    processedBy: index % 2 ? null : admins[0].id,
    stripeRefundId: `re_${payment.id}`,
    createdAt: now,
    processedAt: index % 2 ? null : now,
    idempotencyKey: `refund_${payment.id}`,
  }));
  await insertRows(client, "Refund", refunds);

  const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED");
  await insertRows(client, "Review", completedBookings.map((booking, index) => ({
    id: makeId("review", index + 1),
    rating: index % 3 === 0 ? 4 : 5,
    comment: "Excellent private dining experience with professional service.",
    clientId: booking.clientId,
    chefId: booking.chefId,
    bookingId: booking.id,
    createdAt: now,
    updatedAt: now,
  })));

  const messages = [];
  for (let thread = 0; thread < 15; thread += 1) {
    const chef = chefs[thread % chefs.length];
    const clientUser = clients[thread % clients.length];
    for (let index = 0; index < 4; index += 1) {
      const sender = index % 2 === 0 ? chef : clientUser;
      const receiver = index % 2 === 0 ? clientUser : chef;
      messages.push({
        id: makeId("message", messages.length + 1),
        senderId: sender.id,
        receiverId: receiver.id,
        content: "Looking forward to working together on this event.",
        createdAt: pastDays(thread % 5),
        bookingId: bookings[thread % bookings.length].id,
        isRead: index < 3,
      });
    }
  }
  for (let index = 0; index < 5; index += 1) {
    messages.push({
      id: makeId("message", messages.length + 1),
      senderId: admins[0].id,
      receiverId: chefs[index].id,
      content: "Your profile has been approved. You can now start receiving requests!",
      createdAt: now,
      isRead: true,
    });
  }
  await insertRows(client, "Message", messages);

  const users = [...admins, ...chefs, ...clients];
  await insertRows(client, "Notification", Array.from({ length: 40 }, (_, index) => ({
    id: makeId("notification", index + 1),
    userId: users[index % users.length].id,
    type: ["REQUEST_RECEIVED", "PROPOSAL_SENT", "BOOKING_CONFIRMED", "BOOKING_COMPLETED", "PAYMENT_RECEIVED"][index % 5],
    message: "You have a new platform notification.",
    isRead: index % 3 === 0,
    createdAt: now,
  })));

  await insertRows(client, "Dispute", Array.from({ length: 12 }, (_, index) => ({
    id: makeId("dispute", index + 1),
    bookingId: bookings[index % bookings.length].id,
    reason: ["SERVICE_QUALITY", "PAYMENT_ISSUE", "COMMUNICATION", "CANCELLATION"][index % 4],
    description: "Dispute record for operational testing.",
    status: index < 4 ? "RESOLVED" : index < 8 ? "IN_PROGRESS" : "OPEN",
    evidence: "Photos and email correspondence available.",
    initiatedBy: index % 2 === 0 ? "CLIENT" : "CHEF",
    resolvedBy: index < 4 ? admins[0].id : null,
    resolution: index < 4 ? "Resolved by admin review." : null,
    createdAt: now,
    resolvedAt: index < 4 ? now : null,
  })));

  await insertRows(client, "AuditLog", Array.from({ length: 25 }, (_, index) => ({
    id: makeId("audit", index + 1),
    action: ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT"][index % 5],
    entityType: ["USER", "BOOKING", "PAYMENT", "CHEF_PROFILE", "PROPOSAL"][index % 5],
    entityId: `entity_${index}`,
    newValue: JSON.stringify({ status: "updated", value: index }),
    performedBy: admins[index % admins.length].id,
    reason: "Quality assurance",
    ipAddress: `192.168.1.${100 + index}`,
    userAgent: "Mozilla/5.0",
    createdAt: now,
  })));

  const ledger = [
    ...payments.map((payment, index) => ({
      id: makeId("ledger", index + 1),
      transactionType: "PAYMENT_RECEIVED",
      amount: payment.totalAmount,
      currency: "GBP",
      bookingId: payment.bookingId,
      paymentId: payment.id,
      fromAccount: "CLIENT",
      toAccount: "PLATFORM",
      description: "Payment received for booking",
      createdBy: "system",
      createdAt: now,
    })),
    ...payouts.map((payout, index) => ({
      id: makeId("ledger", payments.length + index + 1),
      transactionType: "PAYOUT_PROCESSED",
      amount: -payout.amount,
      currency: "GBP",
      payoutId: payout.id,
      fromAccount: "PLATFORM",
      toAccount: "CHEF",
      description: "Payout processed to chef",
      createdBy: admins[0].id,
      createdAt: now,
    })),
    ...refunds.map((refund, index) => ({
      id: makeId("ledger", payments.length + payouts.length + index + 1),
      transactionType: "REFUND_PROCESSED",
      amount: -refund.amount,
      currency: "GBP",
      refundId: refund.id,
      fromAccount: "PLATFORM",
      toAccount: "CLIENT",
      description: "Refund processed to client",
      createdBy: admins[0].id,
      createdAt: now,
    })),
  ];
  await insertRows(client, "Ledger", ledger);

  await insertRows(client, "ChefKpiSnapshot", chefProfiles.flatMap((chef, chefIndex) => (
    Array.from({ length: 15 }, (_, dayIndex) => {
      const date = pastDays(14 - dayIndex);
      date.setHours(0, 0, 0, 0);
      return {
        id: makeId("kpi", chefIndex * 15 + dayIndex + 1),
        chefId: chef.id,
        date,
        quotesSent: dayIndex % 5,
        proposalsAccepted: dayIndex % 3,
        proposalsRejected: dayIndex % 2,
        bookingsCompleted: dayIndex % 2,
        messageResponseRate: 0.8,
        proposalResponseRate: 0.6,
        earnings: dayIndex * 25,
        menusCount: 1,
        createdAt: now,
      };
    })
  )));

  await insertRows(client, "WebhookLog", Array.from({ length: 15 }, (_, index) => ({
    id: makeId("webhook", index + 1),
    stripeEventId: `evt_${index + 1}`,
    eventType: ["payment_intent.succeeded", "charge.succeeded", "checkout.session.completed"][index % 3],
    status: index < 12 ? "PROCESSED" : "FAILED",
    payload: JSON.stringify({ event: index + 1 }),
    processedAt: index < 12 ? now : null,
    errorMessage: index >= 12 ? "Temporary processing error" : null,
    retryCount: index >= 12 ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  })));

  await insertRows(client, "EventQueue", Array.from({ length: 10 }, (_, index) => ({
    id: makeId("event", index + 1),
    eventType: ["SEND_NOTIFICATION", "PROCESS_PAYOUT", "UPDATE_KPI", "SEND_EMAIL"][index % 4],
    payload: JSON.stringify({ id: index }),
    status: index < 7 ? "COMPLETED" : index < 9 ? "PENDING" : "FAILED",
    priority: index % 3,
    retryCount: index === 9 ? 3 : 0,
    maxRetries: 3,
    nextRetryAt: index >= 7 ? addDays(1) : null,
    processedAt: index < 7 ? now : null,
    errorMessage: index === 9 ? "Temporary error" : null,
    createdAt: now,
    updatedAt: now,
  })));
}

async function verify(client) {
  const objects = await objectSummary(client);
  const tableRows = objects.tables
    .filter((table) => table.table_schema === "public" && table.table_type === "BASE TABLE")
    .map((table) => table.table_name)
    .sort();

  console.log("TABLES");
  for (const tableName of tableRows) {
    console.log(tableName);
  }

  console.log("");
  console.log("ROW COUNTS");
  const counts = {};
  for (const tableName of tableRows) {
    counts[tableName] = await tableCount(client, tableName);
    console.log(`${tableName}: ${counts[tableName]}`);
  }

  const invalidForeignKeys = await client.query(`
    select conrelid::regclass::text as table_name, conname as constraint_name
    from pg_constraint
    where contype = 'f' and not convalidated
    order by table_name, constraint_name
  `);

  const sequences = await client.query(`
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
    order by sequence_name
  `);

  console.log("");
  console.log("FOREIGN KEY VALIDATION");
  console.log(invalidForeignKeys.length === 0 ? "all foreign keys validated" : JSON.stringify(invalidForeignKeys, null, 2));

  console.log("");
  console.log("SEQUENCES");
  console.log(sequences.length === 0 ? "no sequences found; schema uses text/cuid primary keys" : JSON.stringify(sequences, null, 2));

  return { counts, invalidForeignKeys, sequences };
}

async function main() {
  const ddl = fs.readFileSync(0, "utf8");
  if (!ddl.trim()) {
    throw new Error("Prisma DDL must be provided on stdin.");
  }

  const client = new PgClient(databaseUrl);
  await client.connect();
  try {
    await resetSchema(client, ddl);
    await seed(client);
    await verify(client);
  } finally {
    client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
