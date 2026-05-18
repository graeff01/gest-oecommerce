const appUrl = process.env.HEALTHCHECK_URL || process.env.ADMIN_APP_URL || process.env.APP_URL;

if (!appUrl) {
  console.error("Missing HEALTHCHECK_URL, ADMIN_APP_URL or APP_URL.");
  process.exit(1);
}

const target = new URL("/api/health", appUrl).toString();
const response = await fetch(target, { headers: { "Cache-Control": "no-cache" } });
const text = await response.text();
let payload: unknown = text;

try {
  payload = JSON.parse(text);
} catch {
  // Keep raw response text for debugging.
}

console.log(JSON.stringify(payload, null, 2));

if (!response.ok || (typeof payload === "object" && payload && "ok" in payload && payload.ok === false)) {
  process.exit(1);
}

export {};
