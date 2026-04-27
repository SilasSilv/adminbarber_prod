// Edge Function: send-appointment-reminders
// Runs every 5 minutes via cron. Fetches appointments occurring in ~2h
// and sends Web Push with Confirm/Cancel buttons.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Web Push (VAPID) helpers ----------
function b64urlToUint8(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ToB64url(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToUint8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

async function importVapidPrivateKey(privB64url: string, pubB64url: string): Promise<CryptoKey> {
  // Construct JWK from raw private d + uncompressed public point (0x04|X|Y)
  const pub = b64urlToUint8(pubB64url);
  if (pub.length !== 65 || pub[0] !== 0x04) throw new Error("Invalid VAPID public key");
  const x = uint8ToB64url(pub.slice(1, 33));
  const y = uint8ToB64url(pub.slice(33, 65));
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privB64url,
    x,
    y,
    ext: true,
  };
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function makeVapidJwt(audience: string, subject: string, privKey: CryptoKey): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };
  const enc = (o: unknown) => uint8ToB64url(strToUint8(JSON.stringify(o)));
  const unsigned = `${enc(header)}.${enc(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    strToUint8(unsigned),
  );
  return `${unsigned}.${uint8ToB64url(new Uint8Array(sig))}`;
}

// HKDF (RFC 5869)
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const t1 = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, concat(info, new Uint8Array([1]))));
  return t1.slice(0, length);
}

// Web Push aes128gcm encryption (RFC 8291)
async function encryptPayload(payload: string, p256dhB64: string, authB64: string): Promise<{ body: Uint8Array; serverPubKey: Uint8Array }> {
  const clientPub = b64urlToUint8(p256dhB64); // 65 bytes uncompressed
  const auth = b64urlToUint8(authB64);

  // Generate ephemeral ECDH keypair
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephPubJwk = await crypto.subtle.exportKey("jwk", eph.publicKey);
  const serverPubKey = concat(
    new Uint8Array([0x04]),
    b64urlToUint8(ephPubJwk.x!),
    b64urlToUint8(ephPubJwk.y!),
  );

  // Import client public key
  const clientPubKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: uint8ToB64url(clientPub.slice(1, 33)),
      y: uint8ToB64url(clientPub.slice(33, 65)),
      ext: true,
    },
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientPubKey }, eph.privateKey, 256));

  // PRK_key = HKDF(auth, ECDH, "WebPush: info\0" || ua_pub || as_pub, 32)
  const keyInfo = concat(
    strToUint8("WebPush: info\0"),
    clientPub,
    serverPubKey,
  );
  const ikm = await hkdf(auth, sharedBits, keyInfo, 32);

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK
  const cek = await hkdf(salt, ikm, strToUint8("Content-Encoding: aes128gcm\0"), 16);
  // Nonce
  const nonce = await hkdf(salt, ikm, strToUint8("Content-Encoding: nonce\0"), 12);

  // Plaintext + 0x02 (last record)
  const plaintext = concat(strToUint8(payload), new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, plaintext));

  // Build aes128gcm body: header (salt[16] | rs[4] | idlen[1] | keyid) | ciphertext
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // 4096
  const idlen = new Uint8Array([serverPubKey.length]);
  const header = concat(salt, rs, idlen, serverPubKey);
  const body = concat(header, ciphertext);

  return { body, serverPubKey };
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPub: string,
  vapidPriv: string,
  vapidSubject: string,
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const privKey = await importVapidPrivateKey(vapidPriv, vapidPub);
  const jwt = await makeVapidJwt(audience, vapidSubject, privKey);

  const { body } = await encryptPayload(payload, subscription.p256dh, subscription.auth);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "3600",
      "Authorization": `vapid t=${jwt}, k=${vapidPub}`,
    },
    body,
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, text };
}

// ---------- HMAC token for action links ----------
async function hmacToken(appointmentId: string, action: string, secret: string): Promise<string> {
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

// ---------- Main handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:no-reply@example.com";
    const hmacSecret = Deno.env.get("REMINDER_HMAC_SECRET")!;
    const appPublicUrl = Deno.env.get("APP_PUBLIC_URL") || "";

    const supabase = createClient(supabaseUrl, serviceKey);

    // Window: appointments between now+1h55 and now+2h05
    const now = new Date();
    const lower = new Date(now.getTime() + 115 * 60 * 1000);
    const upper = new Date(now.getTime() + 125 * 60 * 1000);

    // Buscar agendamentos com join para pegar dados da barbearia (pix key, etc)
    const { data: candidates, error } = await supabase
      .from("appointments")
      .select(`
        id, 
        barbershop_id, 
        date, 
        start_time, 
        client_name, 
        client_phone, 
        status, 
        reminder_sent_at,
        barbershops:barbershop_id(name, slug)
      `)
      .eq("status", "agendado")
      .is("reminder_sent_at", null);

    if (error) throw error;

    // Filtrar pelo horário correto (2 horas antes)
    const due = (candidates || []).filter((a: any) => {
      const dt = new Date(`${a.date}T${a.start_time}`);
      return dt >= lower && dt <= upper;
    });

    console.log(`Agendamentos encontrados: ${due.length}`);

    let sent = 0;
    let failed = 0;

    for (const appt of due) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("appointment_id", appt.id);

      if (!subs || subs.length === 0) {
        console.log(`Sem subscription para appointment ${appt.id} (${appt.client_name})`);
        // Ainda assim marca para não checar de novo
        await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
        continue;
      }

      const confirmTok = await hmacToken(appt.id, "confirm", hmacSecret);
      const cancelTok = await hmacToken(appt.id, "cancel", hmacSecret);

      // Usar a URL pública da barbearia ou URL do app
      const baseUrl = appPublicUrl || `https://${supabaseUrl.replace("https://", "").split(".")[0]}.lovable.app`;
      const confirmUrl = `${baseUrl}/confirmacao-agendamento?id=${appt.id}&action=confirm&t=${confirmTok}`;
      const cancelUrl = `${baseUrl}/confirmacao-agendamento?id=${appt.id}&action=cancel&t=${cancelTok}`;

      const hour = appt.start_time?.substring(0, 5) || "";
      const payload = JSON.stringify({
        title: "Você tem um horário agendado ✂️",
        body: `Seu horário é às ${hour}. Deseja confirmar?`,
        tag: `appt-${appt.id}`,
        data: { confirmUrl, cancelUrl, appointmentId: appt.id },
        actions: [
          { action: "confirm", title: "✅ Confirmar" },
          { action: "cancel", title: "❌ Cancelar" },
        ],
      });

      let anySuccess = false;
      for (const sub of subs) {
        try {
          const r = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            vapidPub,
            vapidPriv,
            vapidSubject,
          );
          console.log(`Push -> ${appt.client_phone || appt.client_name}: status=${r.status}`);
          if (r.ok) {
            anySuccess = true;
            sent++;
          } else {
            failed++;
            // Se 404/410, subscription expirou -> remover
            if (r.status === 404 || r.status === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        } catch (e) {
          console.error("Erro enviando push:", e);
          failed++;
        }
      }

      if (anySuccess) {
        await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
      }
    }

    return new Response(
      JSON.stringify({ checked: due.length, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-appointment-reminders error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});