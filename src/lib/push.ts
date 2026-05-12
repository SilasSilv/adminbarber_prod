import { supabase } from "@/integrations/supabase/client";
import { isPushSupported } from "./isPushSupported";

const VAPID_PUBLIC_KEY =
  "BGWZDtOjq1k4hFRdLWornPWCFWJ8YCavjczl6DJU2wnmmzSvj1F6rBaqiOuA2KzGWgI_3em1W7tUkJtORRUwb8A";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function subscribeToReminder(
  appointmentId: string
): Promise<{
  success: boolean;
  reason?: string;
  message?: string;
}> {

  if (!isPushSupported()) {
    return {
      success: false,
      reason: "unsupported",
      message: "Push não suportado neste navegador.",
    };
  }

  // SOLICITA PERMISSÃO DO NAVEGADOR
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return {
      success: false,
      reason: "denied",
      message: "Permissão de notificação negada pelo usuário.",
    };
  }

  const registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    return {
      success: false,
      reason: "error",
      message: "Service Worker não registrado.",
    };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey:
      urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const sub = subscription.toJSON();

  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return {
      success: false,
      reason: "error",
      message: "Subscription incompleta",
    };
  }

  const { error } = await supabase.functions.invoke(
    "save-push-subscription",
    {
      body: {
        appointment_id: appointmentId,
        subscription: sub,
      },
    }
  );

  if (error) {
    return {
      success: false,
      reason: "error",
      message: error.message,
    };
  }

  return { success: true };
}