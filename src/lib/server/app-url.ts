function normalizeUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getAppUrl() {
  const configured =
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configured) {
    const normalized = configured.startsWith("http") ? configured : `https://${configured}`;
    return normalizeUrl(normalized);
  }

  if (process.env.NODE_ENV === "production") {
    return "https://www.thetwoman.site";
  }

  return "http://localhost:3000";
}
