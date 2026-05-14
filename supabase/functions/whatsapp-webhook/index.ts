// supabase/functions/whatsapp-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {

  // =========================
  // CORS
  // =========================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {

    console.log("🔥 WEBHOOK ACIONADO")

    // =========================
    // BODY
    // =========================

    const body = await req.json()

    console.log(
      "📩 Webhook recebido:",
      JSON.stringify(body)
    )

    // =========================
    // NOVA ESTRUTURA VZAPS
    // =========================

    const eventType =
      body?.json_data?.type

    const eventData =
      body?.json_data?.event

    console.log(`📌 Evento: ${eventType}`)

    // =========================
    // VALIDAR EVENTO
    // =========================

    if (eventType !== "Message") {

      console.log("⏭️ Evento ignorado")

      return new Response(
        JSON.stringify({
          ignored: true,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    // =========================
    // IGNORAR MENSAGEM ENVIADA PELA INSTÂNCIA
    // =========================

    if (eventData?.info?.is_from_me === true) {

      console.log("⏭️ Mensagem enviada pela própria instância")

      return new Response(
        JSON.stringify({
          ignored: "from_me",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    // =========================
    // EXTRAIR TELEFONE
    // =========================

    let rawPhone =
      eventData?.info?.sender_alt || ""

    // remove tudo após @
    rawPhone = rawPhone.split("@")[0]

    // mantém apenas números
    rawPhone = rawPhone.replace(/\D/g, "")

    // remove lixo extra da VZaps
    // mantém somente:
    // 55 + DDD + 9 + número
    // total = 13 dígitos
    if (rawPhone.length > 13) {
      rawPhone = rawPhone.substring(0, 13)
    }

    // =========================
    // EXTRAIR TEXTO
    // =========================

    const text =
      (
        eventData?.message?.conversation ||
        ""
      ).trim()

    console.log(`📱 Telefone bruto: ${rawPhone}`)
    console.log(`💬 Texto recebido: ${text}`)

    if (!rawPhone || !text) {

      console.log("⏭️ Sem telefone ou texto")

      return new Response(
        JSON.stringify({
          ignored: "missing_data",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    // =========================
    // NORMALIZAR TELEFONE
    // =========================

    let phone = rawPhone

    // remove 55
    if (phone.startsWith("55")) {
      phone = phone.slice(2)
    }

    // adiciona 9 caso falte
    if (phone.length === 10) {
      phone =
        phone.substring(0, 2) +
        "9" +
        phone.substring(2)
    }

    console.log(`📱 Telefone normalizado: ${phone}`)

    // =========================
    // INTERPRETAR RESPOSTA
    // =========================

    const normalizedText =
      text
        .toLowerCase()
        .trim()

    let novoStatus = ""

    // CONFIRMAR
    if (
      normalizedText === "1" ||
      normalizedText.includes("sim") ||
      normalizedText.includes("confirm") ||
      normalizedText.includes("ok")
    ) {
      novoStatus = "confirmado"
    }

    // CANCELAR
    else if (
      normalizedText === "2" ||
      normalizedText.includes("cancel") ||
      normalizedText.includes("nao") ||
      normalizedText.includes("não")
    ) {
      novoStatus = "cancelado"
    }

    // RESPOSTA INVÁLIDA
    if (!novoStatus) {

      console.log("⏭️ Resposta inválida")

      return new Response(
        JSON.stringify({
          ignored: "invalid_response",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    console.log(`✅ Novo status: ${novoStatus}`)

    // =========================
    // SUPABASE
    // =========================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // =========================
    // DATA DE HOJE
    // =========================

    const hoje = new Date(
      new Date().toLocaleString(
        "en-US",
        {
          timeZone: "America/Sao_Paulo",
        }
      )
    )
      .toISOString()
      .split("T")[0]

    // =========================
    // BUSCAR AGENDAMENTOS
    // =========================

    const {
      data: appointments,
      error,
    } = await supabase
      .from("appointments")
      .select(`
        id,
        client_name,
        client_phone,
        status,
        start_time
      `)
      .eq("date", hoje)
      .eq("status", "agendado")
      .eq("reminder_wpp_sent", true)

    if (error) {
      throw error
    }

    console.log(
      `📋 ${appointments?.length || 0} agendamento(s) encontrado(s)`
    )

    // =========================
    // LOCALIZAR CLIENTE
    // =========================

    const appointment =
      appointments?.find((app) => {

        let dbPhone =
          String(app.client_phone || "")
            .replace(/\D/g, "")

        // remove 55
        if (dbPhone.startsWith("55")) {
          dbPhone = dbPhone.slice(2)
        }

        // adiciona 9 caso falte
        if (dbPhone.length === 10) {
          dbPhone =
            dbPhone.substring(0, 2) +
            "9" +
            dbPhone.substring(2)
        }

        return dbPhone === phone
      })

    // =========================
    // NÃO ENCONTRADO
    // =========================

    if (!appointment) {

      console.log(
        `⚠️ Nenhum agendamento encontrado para ${phone}`
      )

      return new Response(
        JSON.stringify({
          error: "appointment_not_found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    console.log(
      `✅ Agendamento encontrado: ${appointment.id}`
    )

    // =========================
    // ATUALIZAR STATUS
    // =========================

    const { error: updateError } =
      await supabase
        .from("appointments")
        .update({
          status: novoStatus,
        })
        .eq("id", appointment.id)

    if (updateError) {
      throw updateError
    }

    console.log(
      `✅ Status atualizado para ${novoStatus}`
    )

    // =========================
    // RESPOSTA
    // =========================

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointment.id,
        status: novoStatus,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )

  } catch (error: any) {

    console.error(
      "💥 Erro no webhook:",
      error.message
    )

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})