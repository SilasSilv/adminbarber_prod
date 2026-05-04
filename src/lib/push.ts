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

    // Use the correct Edge Function URL
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