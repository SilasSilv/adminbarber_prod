// supabase/functions/send-whatsapp-reminder/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    console.log("🚀 Iniciando envio de lembretes WhatsApp")

    // =========================
    // SUPABASE
    // =========================

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    )!

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // =========================
    // VZAPS
    // =========================

    const vzapsClientToken =
      Deno.env.get("VZAPS_API_KEY")?.trim()!

    const vzapsInstanceToken =
      Deno.env.get("VZAPS_INSTANCE_TOKEN")?.trim()!

    const vzapsInstanceId =
      Deno.env.get("VZAPS_INSTANCE_ID")?.trim()!

    if (
      !vzapsClientToken ||
      !vzapsInstanceToken ||
      !vzapsInstanceId
    ) {
      throw new Error(
        "Secrets da VZaps não carregados corretamente."
      )
    }

    // =========================
    // HORÁRIO BRASÍLIA
    // =========================

    const agora = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "America/Sao_Paulo",
      })
    )

    const daquiDuasHoras = new Date(
      agora.getTime() + 2 * 60 * 60 * 1000
    )

    const hojeData = agora
      .toISOString()
      .split("T")[0]

    const horaAtual =
      agora.toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }) + ":00"

    const horaLimite =
      daquiDuasHoras.toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }) + ":59"

    console.log(
      `📅 Buscando agendamentos de ${hojeData} entre ${horaAtual} e ${horaLimite}`
    )

    // =========================
    // BUSCAR AGENDAMENTOS
    // =========================

    const {
      data: appointments,
      error: appointmentsError,
    } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        status,
        reminder_wpp_sent,
        client_name,
        client_phone,
        barbershop_id
      `)
      .eq("date", hojeData)
      .gte("start_time", horaAtual)
      .lte("start_time", horaLimite)
      .eq("status", "agendado")
      .eq("reminder_wpp_sent", false)

    if (appointmentsError) {
      throw appointmentsError
    }

    console.log(
      `📊 ${appointments?.length || 0} lembrete(s) encontrado(s)`
    )

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Nenhum lembrete pendente",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    const results = []

    // =========================
    // ENVIAR MENSAGENS
    // =========================

    for (const app of appointments) {
      try {

        // =========================
        // NORMALIZAÇÃO DO TELEFONE
        // =========================

        // Remove tudo que não for número
        let phone = String(app.client_phone || "")
          .replace(/\D/g, "")
          .trim()

        // Remove código do Brasil se já existir
        if (phone.startsWith("55")) {
          phone = phone.slice(2)
        }

        // Se estiver sem o 9
        // Exemplo:
        // 1692765463 -> 16992765463
        if (phone.length === 10) {
          phone =
            phone.substring(0, 2) +
            "9" +
            phone.substring(2)
        }

        // Adiciona 55 obrigatoriamente
        phone = `55${phone}`

        // Segurança extra
        phone = phone.replace(/\D/g, "")

        console.log(
          `📞 Número formatado final: ${phone}`
        )

        const horaExibicao =
          app.start_time.substring(0, 5)

        // =========================
        // BUSCAR BARBEARIA
        // =========================

        let barbershopName = "nossa barbearia"

        if (app.barbershop_id) {
          const { data: barbershop } =
            await supabase
              .from("barbershops")
              .select("name")
              .eq("id", app.barbershop_id)
              .single()

          if (barbershop?.name) {
            barbershopName = barbershop.name
          }
        }

        // =========================
        // MENSAGEM
        // =========================

        const message =
          `Olá, ${app.client_name}! 👋\n\n` +
          `Este é um lembrete do seu agendamento na *${barbershopName}* hoje às *${horaExibicao}*.\n\n` +
          `Por favor, confirme sua presença:\n\n` +
          `*1* ✅ Confirmar\n` +
          `*2* ❌ Cancelar`

        const url =
          `https://api.vzaps.com/instances/${vzapsInstanceId}/chat/send/text`

        console.log(
          `📤 Enviando para ${app.client_name} (${phone})`
        )

        // =========================
        // ENVIO VZAPS
        // =========================

        const vzapsResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client-Token": vzapsClientToken,
            "X-Instance-Token": vzapsInstanceToken,
          },
          body: JSON.stringify({
            phone: phone,
            message: message,
          }),
        })

        const responseStatus =
          vzapsResponse.status

        const responseText =
          await vzapsResponse.text()

        console.log(
          `📨 Resposta VZaps: ${responseStatus}`
        )

        if (!vzapsResponse.ok) {
          throw new Error(
            `Erro API VZaps (${responseStatus}): ${responseText}`
          )
        }

        // =========================
        // MARCAR COMO ENVIADO
        // =========================

        await supabase
          .from("appointments")
          .update({
            reminder_wpp_sent: true,
            reminder_wpp_sent_at:
              new Date().toISOString(),
          })
          .eq("id", app.id)

        results.push({
          client: app.client_name,
          phone: phone,
          status: "success",
        })
        console.log(
          `✅ Sucesso para ${app.client_name}`
        )

      } catch (e: any) {

        console.error(
          `❌ Erro no envio ID ${app.id}: ${e.message}`
        )

        results.push({
          id: app.id,
          status: "error",
          error: e.message,
        })
      }
    }

    // =========================
    // RESPOSTA FINAL
    // =========================

    return new Response(
      JSON.stringify({
        success: true,
        results,
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
      "💥 Erro Geral:",
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