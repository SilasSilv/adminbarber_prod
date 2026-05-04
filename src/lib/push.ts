// Helper: registra service worker e faz subscribe em Web Push para lembrete.
import { supabase } from "@/integrations/supabase/client";

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

export async function subscribeToReminder(appointmentId: string): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;

    // ✅ FIX 1: Só pede permissão após gesto explícito do usuário (esta
    // função deve ser chamada DENTRO de um onClick — não em useEffect ou
    // ao montar o componente. O browser bloqueia requestPermission() que
    // não origina de um evento de clique.)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    // ✅ FIX 2: Garante que o SW está registrado antes de continuar.
    // getRegistration() retorna undefined se nenhum SW está ativo ainda.
    // A ordem correta é: tentar pegar o existente, senão registrar um novo,
    // e só então aguardar o ready (que retorna o registro ativo).
    let reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js");
    }
    // Aguarda o SW estar completamente ativo
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // ✅ FIX 3: Passa a Uint8Array diretamente — NÃO use .buffer.
        // Uint8Array é o tipo correto para applicationServerKey.
        // Ao usar .buffer você extrai o ArrayBuffer subjacente, que perde
        // o offset/length da view e pode causar a chave VAPID ser inválida,
        // resultando em DOMException e bloqueio da subscription.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
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