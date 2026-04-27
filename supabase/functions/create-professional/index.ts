import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 2. Criar cliente Supabase com ENV (SEGURO)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    
    // 3. Verificar usuário
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(token)
    
    if (verifyError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Ler dados
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Buscar barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (barbershopError || !barbershop) {
      return new Response(JSON.stringify({ 
        error: 'Nenhuma barbearia encontrada para este usuário.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Criar usuário
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'professional',
        barbershop_id: barbershop.id
      }
    })

    if (createUserError) {
      return new Response(JSON.stringify({ 
        error: 'Erro ao criar usuário: ' + createUserError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 7. Criar profissional
    const { error: insertError } = await supabase
      .from('professionals')
      .insert({
        name: name.trim(),
        email: email.trim(),
        user_id: newUser.user.id,
        barbershop_id: barbershop.id,
        active: true,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      await supabase.auth.admin.deleteUser(newUser.user.id)

      return new Response(JSON.stringify({ 
        error: 'Erro ao salvar profissional: ' + insertError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. Sucesso
    return new Response(JSON.stringify({ 
      success: true,
      professionalId: newUser.user.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Erro interno: ' + error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})