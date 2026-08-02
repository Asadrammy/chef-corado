function normalizeDatabaseUrl(url) {
  if (!url) return url;

  const trimmedUrl = url.trim();
  if (
    (trimmedUrl.startsWith('"') && trimmedUrl.endsWith('"')) ||
    (trimmedUrl.startsWith("'") && trimmedUrl.endsWith("'"))
  ) {
    return trimmedUrl.slice(1, -1).trim();
  }

  return trimmedUrl;
}

function expandRenderPostgresHost(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const region = process.env.RENDER_POSTGRES_REGION || process.env.DATABASE_RENDER_REGION || "singapore";

    if (url.hostname.startsWith("dpg-") && !url.hostname.includes(".")) {
      url.hostname = `${url.hostname}.${region}-postgres.render.com`;
      if (!url.port) {
        url.port = "5432";
      }
      url.searchParams.set("sslmode", "require");
      return url.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

const databaseUrl = normalizeDatabaseUrl(
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL
);

if (!databaseUrl) {
  process.exit(1);
}

process.stdout.write(expandRenderPostgresHost(databaseUrl));
