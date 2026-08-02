const { PgClient } = require("./render-pg-direct-migrate.cjs");

const databaseUrl = process.env.DESTINATION_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DESTINATION_DATABASE_URL or DATABASE_URL is required.");
  process.exit(1);
}

const tables = [
  "Account",
  "AuditLog",
  "Availability",
  "Booking",
  "ChefKpiSnapshot",
  "ChefProfile",
  "Dispute",
  "EventQueue",
  "Experience",
  "Ledger",
  "Menu",
  "MenuItem",
  "MenuSection",
  "Message",
  "ModerationFlag",
  "Notification",
  "NotificationPreference",
  "Payment",
  "Payout",
  "Proposal",
  "Refund",
  "Request",
  "RequestInvitation",
  "Review",
  "Session",
  "SlotLock",
  "User",
  "VerificationToken",
  "WebhookLog",
];

const orphanQueries = [
  ["Account.userId -> User.id", 'select count(*)::text as orphan_count from "Account" c left join "User" p on p."id" = c."userId" where c."userId" is not null and p."id" is null'],
  ["Session.userId -> User.id", 'select count(*)::text as orphan_count from "Session" c left join "User" p on p."id" = c."userId" where c."userId" is not null and p."id" is null'],
  ["ChefProfile.userId -> User.id", 'select count(*)::text as orphan_count from "ChefProfile" c left join "User" p on p."id" = c."userId" where c."userId" is not null and p."id" is null'],
  ["Menu.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Menu" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["MenuSection.menuId -> Menu.id", 'select count(*)::text as orphan_count from "MenuSection" c left join "Menu" p on p."id" = c."menuId" where c."menuId" is not null and p."id" is null'],
  ["MenuItem.menuSectionId -> MenuSection.id", 'select count(*)::text as orphan_count from "MenuItem" c left join "MenuSection" p on p."id" = c."menuSectionId" where c."menuSectionId" is not null and p."id" is null'],
  ["Experience.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Experience" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["Request.clientId -> User.id", 'select count(*)::text as orphan_count from "Request" c left join "User" p on p."id" = c."clientId" where c."clientId" is not null and p."id" is null'],
  ["RequestInvitation.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "RequestInvitation" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["RequestInvitation.requestId -> Request.id", 'select count(*)::text as orphan_count from "RequestInvitation" c left join "Request" p on p."id" = c."requestId" where c."requestId" is not null and p."id" is null'],
  ["Proposal.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Proposal" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["Proposal.menuId -> Menu.id", 'select count(*)::text as orphan_count from "Proposal" c left join "Menu" p on p."id" = c."menuId" where c."menuId" is not null and p."id" is null'],
  ["Proposal.requestId -> Request.id", 'select count(*)::text as orphan_count from "Proposal" c left join "Request" p on p."id" = c."requestId" where c."requestId" is not null and p."id" is null'],
  ["Booking.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Booking" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["Booking.clientId -> User.id", 'select count(*)::text as orphan_count from "Booking" c left join "User" p on p."id" = c."clientId" where c."clientId" is not null and p."id" is null'],
  ["Booking.experienceId -> Experience.id", 'select count(*)::text as orphan_count from "Booking" c left join "Experience" p on p."id" = c."experienceId" where c."experienceId" is not null and p."id" is null'],
  ["Booking.proposalId -> Proposal.id", 'select count(*)::text as orphan_count from "Booking" c left join "Proposal" p on p."id" = c."proposalId" where c."proposalId" is not null and p."id" is null'],
  ["Payment.bookingId -> Booking.id", 'select count(*)::text as orphan_count from "Payment" c left join "Booking" p on p."id" = c."bookingId" where c."bookingId" is not null and p."id" is null'],
  ["Review.bookingId -> Booking.id", 'select count(*)::text as orphan_count from "Review" c left join "Booking" p on p."id" = c."bookingId" where c."bookingId" is not null and p."id" is null'],
  ["Review.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Review" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["Review.clientId -> User.id", 'select count(*)::text as orphan_count from "Review" c left join "User" p on p."id" = c."clientId" where c."clientId" is not null and p."id" is null'],
  ["Notification.userId -> User.id", 'select count(*)::text as orphan_count from "Notification" c left join "User" p on p."id" = c."userId" where c."userId" is not null and p."id" is null'],
  ["NotificationPreference.userId -> User.id", 'select count(*)::text as orphan_count from "NotificationPreference" c left join "User" p on p."id" = c."userId" where c."userId" is not null and p."id" is null'],
  ["Message.receiverId -> User.id", 'select count(*)::text as orphan_count from "Message" c left join "User" p on p."id" = c."receiverId" where c."receiverId" is not null and p."id" is null'],
  ["Message.senderId -> User.id", 'select count(*)::text as orphan_count from "Message" c left join "User" p on p."id" = c."senderId" where c."senderId" is not null and p."id" is null'],
  ["Availability.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Availability" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["Payout.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "Payout" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
  ["Refund.paymentId -> Payment.id", 'select count(*)::text as orphan_count from "Refund" c left join "Payment" p on p."id" = c."paymentId" where c."paymentId" is not null and p."id" is null'],
  ["Dispute.bookingId -> Booking.id", 'select count(*)::text as orphan_count from "Dispute" c left join "Booking" p on p."id" = c."bookingId" where c."bookingId" is not null and p."id" is null'],
  ["Ledger.bookingId -> Booking.id", 'select count(*)::text as orphan_count from "Ledger" c left join "Booking" p on p."id" = c."bookingId" where c."bookingId" is not null and p."id" is null'],
  ["Ledger.paymentId -> Payment.id", 'select count(*)::text as orphan_count from "Ledger" c left join "Payment" p on p."id" = c."paymentId" where c."paymentId" is not null and p."id" is null'],
  ["Ledger.payoutId -> Payout.id", 'select count(*)::text as orphan_count from "Ledger" c left join "Payout" p on p."id" = c."payoutId" where c."payoutId" is not null and p."id" is null'],
  ["Ledger.refundId -> Refund.id", 'select count(*)::text as orphan_count from "Ledger" c left join "Refund" p on p."id" = c."refundId" where c."refundId" is not null and p."id" is null'],
  ["ChefKpiSnapshot.chefId -> ChefProfile.id", 'select count(*)::text as orphan_count from "ChefKpiSnapshot" c left join "ChefProfile" p on p."id" = c."chefId" where c."chefId" is not null and p."id" is null'],
];

async function main() {
  const db = new PgClient(databaseUrl);
  await db.connect();
  try {
    console.log("FRESH TABLE COUNTS");
    for (const table of tables) {
      const rows = await db.query(`select count(*)::text as count from "${table}"`);
      console.log(`${table}: ${rows[0].count}`);
    }

    console.log("");
    console.log("ORPHAN CHECKS");
    for (const [label, sql] of orphanQueries) {
      const rows = await db.query(sql);
      console.log(`QUERY: ${sql}`);
      console.log(`${label}: ${rows[0].orphan_count}`);
    }
  } finally {
    db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
