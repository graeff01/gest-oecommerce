const appUrl = process.env.ADMIN_APP_URL || process.env.APP_URL;
const adminSecret = process.env.ADMIN_SECRET;

if (!appUrl || !adminSecret) {
  console.error("Missing ADMIN_APP_URL/APP_URL or ADMIN_SECRET.");
  process.exit(1);
}

const target = new URL("/api/admin/backup", appUrl).toString();
const response = await fetch(target, {
  method: "POST",
  headers: { "x-admin-secret": adminSecret }
});

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
