import { supabase } from "@/integrations/supabase/client";
import { isPushSupported } from "./isPushSupported";

export async function subscribeToReminder(appointmentId: string): Promise<{ success: boolean; reason?: string; message?: string }> {
  if (!isPushSupported()) {
    return { success: false, reason: "unsupported", message: "Push não suportado neste navegador." };
  }

  const reg = await (await navigator.serviceWorker.getRegistration("/")).pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const sub = await reg.toJSON();
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { success: false, reason: "error", message: "Subscription incompleta" };
  }

  const { error } = await supabase.functions.invoke("save-push-subscription", {
    body: { appointment_id: appointmentId, subscription: sub },
  });

  if (error) {
    return { success: false, reason: "error", message: error.message };
  }

  return { success: true };
}