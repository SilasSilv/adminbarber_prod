import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_MAILTO =
  Deno.env.get("VAPID_MAILTO") ?? "mailto:contato@seudominio.com";

const CRON_SECRET = Deno.env.get("CRON_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

webpush.setVapidDetails(
  VAPID_MAILTO,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function logInfo(message: string, data?: unknown) {
  console.log("[REMINDER] " + message, data ?? "");
}

function logError(message: string, data?: unknown) {
  console.error("[REMINDER] " + message, data ?? "");
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Método inválido
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Segurança do cron
  const authHeader = req.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Busca notificações pendentes
  const now = new Date();

  const { data: pendingNotifications, error: fetchErr } = await supabase
    .from("scheduled_notifications")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", now.toISOString())
    .order("send_at", { ascending: true });

  if (fetchErr) {
    logError("Failed to fetch pending notifications", fetchErr);

    return new Response(
      JSON.stringify({
        error: fetchErr.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (!pendingNotifications?.length) {
    logInfo("No pending notifications");

    return new Response(
      JSON.stringify({
        ok: true,
        sent: 0,
        failed: 0,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  logInfo(`Found ${pendingNotifications.length} notifications`);

  let sentCount = 0;
  let failedCount = 0;

  // Processa cada notificação
  for (const notif of pendingNotifications) {
    try {
      // Busca appointment
      const { data: appointment, error: apptErr } = await supabase
        .from("appointments")
        .select(`
          id,
          barbershop_id,
          client_name,
          client_phone,
          date,
          start_time
        `)
        .eq("id", notif.appointment_id)
        .single();

      if (apptErr || !appointment) {
        throw new Error("Appointment not found");
      }

      // Busca subscription
      const { data: subscriptions, error: subErr } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("barbershop_id", appointment.barbershop_id);

      if (subErr) {
        throw new Error(subErr.message);
      }

      if (!subscriptions?.length) {
        throw new Error("No subscriptions found");
      }

      // Hora formatada
      const appointmentDate = new Date(
        `${appointment.date}T${appointment.start_time}`
      );

      const timeStr = appointmentDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });

      const payload = JSON.stringify({
        title: "Lembrete de agendamento",
        body: `Seu horário está marcado para ${timeStr}. Faltam 2 horas!`,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        data: {
          appointment_id: appointment.id,
        },
      });

      // Envia para todas subscriptions
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );

          logInfo("Push sent", {
            notification_id: notif.id,
          });
        } catch (pushErr) {
          logError("Push subscription failed", pushErr);
        }
      }

      // Atualiza notification
      const { error: updErr } = await supabase
        .from("scheduled_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notif.id);

      if (updErr) {
        throw updErr;
      }

      // Marca appointment
      await supabase
        .from("appointments")
        .update({
          reminder_sent: true,
        })
        .eq("id", appointment.id);

      sentCount++;
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Unknown error";

      logError("Notification failed", {
        notification_id: notif.id,
        error: errMsg,
      });

      await supabase
        .from("scheduled_notifications")
        .update({
          status: "failed",
          error_message: errMsg,
        })
        .eq("id", notif.id);

      failedCount++;
    }
  }

  logInfo(`Completed`, {
    sent: sentCount,
    failed: failedCount,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      sent: sentCount,
      failed: failedCount,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});