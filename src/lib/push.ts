import { supabase } from "@/integrations/supabase/client";

// VAPID public key (deve estar no .env ou hardcoded se for teste)
const VAPID_PUBLIC_KEY = "BEYenkyFK8yKj-Khk8l6n4D6Dkbc63s_h5uU0-D6NvBIiEpVL-DHTwRNrRxaRrGidh2a72UAEduHwndEaPlV8H4";

// Helper para converter base64 para Uint8Array (necessário para o VAPID key)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// Verifica se o navegador suporta Push Notifications e Service Workers
function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Pede permissão, registra o Service Worker e salva a subscription no Supabase
 * vinculada ao appointmentId para receber lembretes.
 */
export async function subscribeToReminder(appointmentId: string): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      console.warn("Push notifications not supported in this browser.");
      return false;
    }

    // 1. Pede permissão para enviar notificações
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied.");
      return false;
    }

    // 2. Registra o Service Worker
    const registration = await navigator.serviceWorker.ready;

    // 3. Verifica se já existe uma subscription ativa
    let subscription = await registration.pushManager.getSubscription();

    // 4. Se não existir, cria uma nova usando a VAPID public key
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // 5. Envia a subscription para a Edge Function do Supabase salvar
    const { data, error } = await supabase.functions.invoke("save-push-subscription", {
      body: {
        appointment_id: appointmentId,
        subscription: subscription.toJSON(),
      },
    });

    if (error) {
      console.error("Error saving push subscription:", error);
      return false;
    }

    console.log("Push subscription saved successfully:", data);
    return true;
  } catch (error) {
    console.error("Unexpected error in subscribeToReminder:", error);
    return false;
  }
}