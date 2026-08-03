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

const databaseUrl = normalizeDatabaseUrl(
  process.env.DATABASE_PUBLIC_URL ||
  process.env.EXTERNAL_DATABASE_URL ||
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL
);

if (!databaseUrl) {
  process.exit(1);
}

process.stdout.write(databaseUrl);
