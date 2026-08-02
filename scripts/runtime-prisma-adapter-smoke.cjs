const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const adminEmail = "james.admin@chefmarket.com";
const adminPassword = "admin123";
const chefEmail = "maria.santos@chefmarket.com";
const chefPassword = "chef123";

function mask(value) {
  return value ? value.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@") : value;
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(headers) {
    const getSetCookie = headers.getSetCookie?.bind(headers);
    const values = getSetCookie ? getSetCookie() : [];
    const fallback = headers.get("set-cookie");
    const cookies = values.length ? values : fallback ? [fallback] : [];

    for (const raw of cookies) {
      for (const part of splitSetCookie(raw)) {
        const [pair] = part.split(";");
        const index = pair.indexOf("=");
        if (index > 0) {
          this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
        }
      }
    }
  }

  header() {
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+(?:\.[^;,=\s]+)?=)/g).map((part) => part.trim());
}

async function request(path, options = {}, jar = null) {
  const headers = new Headers(options.headers || {});
  if (jar?.header()) headers.set("cookie", jar.header());
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: options.redirect || "manual",
  });
  jar?.store(response.headers);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, headers: response.headers, body, text };
}

async function login(email, password) {
  const jar = new CookieJar();
  const csrf = await request("/api/auth/csrf", {}, jar);
  if (csrf.status !== 200 || !csrf.body?.csrfToken) {
    throw new Error(`CSRF failed for ${email}: ${csrf.status} ${csrf.text}`);
  }

  const form = new URLSearchParams({
    csrfToken: csrf.body.csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/dashboard`,
    json: "true",
  });

  const auth = await request(
    "/api/auth/callback/credentials?json=true",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    },
    jar
  );

  const session = await request("/api/auth/session", {}, jar);
  if (session.status !== 200 || !session.body?.user?.id) {
    throw new Error(`Session failed for ${email}: auth=${auth.status} session=${session.status} ${session.text}`);
  }

  return { jar, auth, session };
}

async function main() {
  console.log(`DATABASE_URL=${mask(process.env.DATABASE_URL)}`);

  const health = await request("/api/health");
  console.log(`HEALTH status=${health.status} db=${health.body?.database?.status} dbResponse=${health.body?.database?.responseTime}`);

  const admin = await login(adminEmail, adminPassword);
  console.log(`ADMIN_LOGIN authStatus=${admin.auth.status} sessionEmail=${admin.session.body.user.email} role=${admin.session.body.user.role} userId=${admin.session.body.user.id}`);

  const chef = await login(chefEmail, chefPassword);
  console.log(`CHEF_LOGIN authStatus=${chef.auth.status} sessionEmail=${chef.session.body.user.email} role=${chef.session.body.user.role} userId=${chef.session.body.user.id}`);

  const users = await request("/api/users", {}, admin.jar);
  console.log(`USERS_LIST status=${users.status} count=${Array.isArray(users.body) ? users.body.length : "n/a"} first=${Array.isArray(users.body) && users.body[0] ? users.body[0].email : "n/a"}`);

  const menus = await request("/api/menus", {}, chef.jar);
  console.log(`CHEF_MENUS_LIST status=${menus.status} count=${Array.isArray(menus.body) ? menus.body.length : "n/a"} titles=${Array.isArray(menus.body) ? menus.body.map((m) => m.title).slice(0, 3).join(" | ") : "n/a"}`);

  const chefDashboard = await request("/api/chef/dashboard", {}, chef.jar);
  console.log(`CHEF_DASHBOARD status=${chefDashboard.status} menusCount=${chefDashboard.body?.menusCount} bookings=${chefDashboard.body?.bookings?.length} proposals=${chefDashboard.body?.proposals?.length} profileEmail=${chefDashboard.body?.profile?.user?.email}`);

  const adminBookings = await request("/api/admin/bookings", {}, admin.jar);
  const bookingList = Array.isArray(adminBookings.body) ? adminBookings.body : [];
  const relationBooking = bookingList.find((booking) => booking.client && booking.chef?.user && booking.payments) || bookingList[0];
  console.log(`ADMIN_BOOKINGS_RELATIONS status=${adminBookings.status} count=${bookingList.length} sampleId=${relationBooking?.id || "n/a"} client=${relationBooking?.client?.email || relationBooking?.client?.name || "n/a"} chef=${relationBooking?.chef?.user?.email || relationBooking?.chef?.user?.name || "n/a"} payment=${relationBooking?.payments?.status || "n/a"}`);

  const bookingDetail = relationBooking?.id ? await request(`/api/bookings/${relationBooking.id}`, {}, admin.jar) : { status: 0, body: null };
  console.log(`BOOKING_DETAIL status=${bookingDetail.status} id=${bookingDetail.body?.id || "n/a"} chef=${bookingDetail.body?.chef?.user?.email || "n/a"} client=${bookingDetail.body?.client?.email || "n/a"} payment=${bookingDetail.body?.payments?.status || "n/a"}`);

  const createdNotification = await request(
    "/api/notifications",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: admin.session.body.user.id,
        type: "PAYMENT_SUCCESS",
        message: `Runtime Prisma adapter smoke test ${new Date().toISOString()}`,
      }),
    },
    admin.jar
  );
  console.log(`NOTIFICATION_CREATE status=${createdNotification.status} id=${createdNotification.body?.id || "n/a"} isRead=${createdNotification.body?.isRead}`);

  const notificationId = createdNotification.body?.id;
  const markedNotification = notificationId
    ? await request(`/api/notifications/${notificationId}?action=mark-read`, { method: "PATCH" }, admin.jar)
    : { status: 0, body: null };
  console.log(`NOTIFICATION_MARK_READ status=${markedNotification.status} id=${markedNotification.body?.notification?.id || "n/a"} isRead=${markedNotification.body?.notification?.isRead}`);

  const notifications = await request(`/api/notifications?userId=${admin.session.body.user.id}`, {}, admin.jar);
  const createdVisible = Array.isArray(notifications.body?.notifications)
    ? notifications.body.notifications.some((notification) => notification.id === notificationId && notification.isRead === true)
    : false;
  console.log(`NOTIFICATION_REFETCH status=${notifications.status} totalReturned=${notifications.body?.notifications?.length ?? "n/a"} createdVisibleMarkedRead=${createdVisible}`);

  const bookingStatus = relationBooking?.id ? await request(`/api/bookings/${relationBooking.id}/status`, {}, admin.jar) : { status: 0, body: null };
  console.log(`TRANSACTION_ROUTE_BOOKING_STATUS status=${bookingStatus.status} id=${bookingStatus.body?.id || "n/a"} effectiveStatus=${bookingStatus.body?.status || "n/a"} isStale=${bookingStatus.body?.isStale}`);

  const burstPaths = [
    "/api/health",
    "/api/users",
    "/api/admin/bookings",
    "/api/menus",
    "/api/chef/dashboard",
  ];
  const burst = await Promise.all(
    Array.from({ length: 20 }, (_, index) => {
      const path = burstPaths[index % burstPaths.length];
      const jar = path.includes("/menus") || path.includes("/chef/") ? chef.jar : admin.jar;
      return request(path, {}, path === "/api/health" ? null : jar)
        .then((result) => ({ path, status: result.status }))
        .catch((error) => ({ path, error: error.message }));
    })
  );
  const burstSummary = burst.reduce((acc, result) => {
    const key = result.error ? `ERR:${result.error}` : String(result.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(`CONCURRENT_BURST total=${burst.length} summary=${JSON.stringify(burstSummary)}`);
  for (const result of burst) {
    console.log(`CONCURRENT_RESULT path=${result.path} status=${result.status || "ERR"} error=${result.error || ""}`);
  }

  if (notificationId) {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    try {
      const deleted = await prisma.notification.deleteMany({ where: { id: notificationId } });
      console.log(`CLEANUP_TEST_NOTIFICATION deleted=${deleted.count}`);
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch((error) => {
  console.error("SMOKE_TEST_FAILED");
  console.error(error);
  process.exit(1);
});
