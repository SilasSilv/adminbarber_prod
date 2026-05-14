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
  // =====================================================
  // CORS
  // =====================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // =====================================================
  // METHOD VALIDATION
  // =====================================================

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

  // =====================================================
  // AUTH VALIDATION
  // =====================================================

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

  // =====================================================
  // SUPABASE CLIENT
  // =====================================================

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  // =====================================================
  // 1️⃣ CRIA scheduled_notifications AUTOMATICAMENTE
  // =====================================================

  const { data: appointmentsWithoutReminder, error: appointmentsErr } =
    await supabase
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        reminder_sent
      `)
      .or("reminder_sent.is.null,reminder_sent.eq.false");

  if (appointmentsErr) {
    logError("Failed to fetch appointments", appointmentsErr);
  }

  if (appointmentsWithoutReminder?.length) {
    for (const appointment of appointmentsWithoutReminder) {
      try {
        const appointmentDate = new Date(
          `${appointment.date}T${appointment.start_time}`
        );

        const sendAt = new Date(
          appointmentDate.getTime() - 2 * 60 * 60 * 1000
        );

        const { data: existing } = await supabase
          .from("scheduled_notifications")
          .select("id")
          .eq("appointment_id", appointment.id)
          .maybeSingle();

        if (!existing) {
          const { error: insertErr } = await supabase
            .from("scheduled_notifications")
            .insert({
              appointment_id: appointment.id,
              send_at: sendAt.toISOString(),
              status: "pending",
            });

          if (insertErr) {
            logError("Failed to create notification", insertErr);
          } else {
            logInfo("Notification created", {
              appointment_id: appointment.id,
            });
          }
        }
      } catch (err) {
        logError("Error creating scheduled notification", err);
      }
    }
  }

  // =====================================================
  // 2️⃣ BUSCA NOTIFICAÇÕES PENDENTES
  // =====================================================

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

  // =====================================================
  // 3️⃣ ENVIA PUSH
  // =====================================================

  for (const notif of pendingNotifications) {
    try {
      // =====================================================
      // BUSCA APPOINTMENT
      // =====================================================

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

      // =====================================================
      // BUSCA SUBSCRIPTIONS
      // =====================================================

      let subscriptions = [];

      // tenta buscar pelo barbershop_id
      const { data: subscriptionsByBarbershop, error: subErr } =
        await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("barbershop_id", appointment.barbershop_id);

      if (subErr) {
        throw new Error(subErr.message);
      }

      subscriptions = subscriptionsByBarbershop ?? [];

      // fallback para subscriptions antigas sem barbershop_id
      if (!subscriptions.length) {
        logInfo(
          "No subscriptions by barbershop_id, trying fallback subscriptions"
        );

        const { data: fallbackSubscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .limit(5);

        subscriptions = fallbackSubscriptions ?? [];
      }

      if (!subscriptions.length) {
        throw new Error("No subscriptions found");
      }

      // =====================================================
      // PREPARA PAYLOAD
      // =====================================================

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

      // =====================================================
      // ENVIA PUSH
      // =====================================================

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
            endpoint: sub.endpoint,
          });
        } catch (pushErr: any) {
          logError("Push subscription failed", {
            statusCode: pushErr?.statusCode,
            endpoint: sub.endpoint,
            body: pushErr?.body,
          });

          // =====================================================
          // REMOVE SUBSCRIPTIONS EXPIRADAS
          // =====================================================

          if (
            pushErr?.statusCode === 404 ||
            pushErr?.statusCode === 410
          ) {
            logInfo("Removing expired subscription", {
              endpoint: sub.endpoint,
            });

            const { error: deleteErr } = await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);

            if (deleteErr) {
              logError("Failed to delete expired subscription", {
                endpoint: sub.endpoint,
                error: deleteErr,
              });
            } else {
              logInfo("Expired subscription removed", {
                endpoint: sub.endpoint,
              });
            }
          }
        }
      }

      // =====================================================
      // ATUALIZA STATUS
      // =====================================================

      await supabase
        .from("scheduled_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notif.id);

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

  // =====================================================
  // FINALIZA
  // =====================================================

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