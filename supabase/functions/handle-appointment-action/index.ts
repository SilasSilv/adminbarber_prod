// Edge Function: handle-appointment-action
// Recebe { appointment_id, action, token } e atualiza status para confirmado/cancelado.
// Token é HMAC-SHA256(appointment_id:action) com REMINDER_HMAC_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function strToUint8(s: string) {
  return new TextEncoder().encode(s);
}
function uint8ToB64url(u8: Uint8Array) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function expectedToken(appointmentId: string, action: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    strToUint8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, strToUint8(`${appointmentId}:${action}`));
  return uint8ToB64url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { appointment_id, action, token } = await req.json().catch(() => ({}));

    if (!appointment_id || !action || !token) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action !== "confirm" && action !== "cancel") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("REMINDER_HMAC_SECRET")!;
    const expected = await expectedToken(appointment_id, action, secret);
    if (!timingSafeEqual(token, expected)) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: appt, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, status, date, start_time, client_name, barbershop_id")
      .eq("id", appointment_id)
      .maybeSingle();

    if (fetchErr || !appt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bloquear alterar agendamentos já atendidos
    if (appt.status === "atendido") {
      return new Response(JSON.stringify({ error: "Already completed", status: appt.status }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = action === "confirm" ? "confirmado" : "cancelado";

    const { error: updErr } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointment_id);

    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        ok: true,
        status: newStatus,
        client_name: appt.client_name,
        date: appt.date,
        start_time: appt.start_time,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("handle-appointment-action error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});