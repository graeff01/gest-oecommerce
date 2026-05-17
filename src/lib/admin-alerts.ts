import "server-only";

export type AdminAlertPayload = {
  title: string;
  message: string;
  level?: "info" | "warning" | "critical";
  data?: unknown;
};

async function postJson(url: string | undefined, payload: AdminAlertPayload) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        app: "admin-master",
        at: new Date().toISOString()
      })
    });
  } catch {
    // Alerting is best-effort; never break the operational flow.
  }
}

export async function sendAdminAlert(payload: AdminAlertPayload) {
  await Promise.all([
    postJson(process.env.ADMIN_ALERT_WEBHOOK_URL, payload),
    postJson(process.env.ADMIN_WHATSAPP_WEBHOOK_URL, payload),
    postJson(process.env.ADMIN_EMAIL_WEBHOOK_URL, payload)
  ]);
}
