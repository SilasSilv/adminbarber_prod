// Edge Function: save-push-subscription

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function log(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  data?: unknown
) {
  console[level === "ERROR"
    ? "error"
    : level === "WARN"
    ? "warn"
    : "log"](
    JSON.stringify({
      level,
      message,
      data,
      ts: new Date().toISOString(),
    })
  );
}

Deno.serve(async (req) => {
  // =====================================================
  // CORS
  // =====================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
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

  try {
    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      log("WARN", "Body inválido — não é JSON");

      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { appointment_id, subscription } = body as {
      appointment_id?: string;
      subscription?: {
        endpoint?: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      };
    };

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!appointment_id) {
      log("WARN", "Payload inválido: appointment_id ausente");

      return new Response(
        JSON.stringify({
          error: "appointment_id is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      log("WARN", "Payload inválido: subscription incompleta", {
        subscription,
      });

      return new Response(
        JSON.stringify({
          error: "Invalid subscription payload",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // SUPABASE
    // =====================================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // =====================================================
    // BUSCA APPOINTMENT + BARBERSHOP_ID
    // =====================================================

    const { data: appt, error: fErr } = await supabase
      .from("appointments")
      .select(`
        id,
        barbershop_id
      `)
      .eq("id", appointment_id)
      .maybeSingle();

    if (fErr) {
      log("ERROR", "Erro ao buscar appointment", {
        appointment_id,
        error: fErr,
      });

      throw fErr;
    }

    if (!appt) {
      log("WARN", "Appointment não encontrado", {
        appointment_id,
      });

      return new Response(
        JSON.stringify({
          error: "Appointment not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // UPSERT PUSH SUBSCRIPTION
    // =====================================================

    const payload = {
      appointment_id,
      barbershop_id: appt.barbershop_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    };

    log("INFO", "Salvando push subscription", payload);

    const { error: upsertError } = await supabase
      .from("push_subscriptions")
      .upsert(payload, {
        onConflict: "endpoint",
      });

    if (upsertError) {
      log("ERROR", "Erro no upsert de push_subscription", {
        appointment_id,
        error: upsertError,
      });

      throw upsertError;
    }

    log("INFO", "Push subscription salva com sucesso", {
      appointment_id,
      barbershop_id: appt.barbershop_id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    log("ERROR", "Erro inesperado em save-push-subscription", {
      error: (e as Error).message,
    });

    return new Response(
      JSON.stringify({
        error: (e as Error).message,
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
});