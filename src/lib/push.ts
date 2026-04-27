// Helper: registra service worker e faz subscribe em Web Push para lembrete.
import { supabase } from "@/integrations/supabase/client";

// VAPID public key (segura para expor no frontend)
const VAPID_PUBLIC_KEY =
  "BEYenkyFK8yKj-Khk8l6n4D6Dkbc63s_h5uU0-D6NvBIiEpVL-DHTwRNrRxaRrGidh2a72UAEduHwndEaPlV8H4";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Pede permissão e registra subscription para o appointment.
 * Retorna true se gravou com sucesso.
 */
export async function subscribeToReminder(appointmentId: string): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    const { error } = await supabase.functions.invoke("save-push-subscription", {
      body: {
        appointment_id: appointmentId,
        subscription: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        },
      },
    });

    if (error) {
      console.error("save-push-subscription error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("subscribeToReminder error:", e);
    return false;
  }
}