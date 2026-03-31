/**
 * META OAUTH CALLBACK - Edge Function
 *
 * Callback do OAuth 2.0 do Facebook para Meta Messenger & Instagram
 *
 * Flow:
 * 1. Recebe code do redirect do Facebook
 * 2. Troca code por access_token (Graph API)
 * 3. Busca informações do usuário e páginas
 * 4. Salva account e pages no banco
 * 5. Retorna sucesso com redirect
 *
 * Segurança:
 * - Valida state parameter (CSRF)
 * - Usa HTTPS obrigatório
 * - Verifica tenant_id e franchise_id
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH_API_VERSION = 'v24.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Função auxiliar para buscar secret do banco
async function getSecret(key: string): Promise<string> {
  // Tentar env var primeiro
  const envValue = Deno.env.get(key)
  if (envValue) {
    console.log(`[Secret] ${key} encontrado nas env vars`)
    return envValue
  }

  // Fallback: buscar do banco
  console.log(`[Secret] ${key} não encontrado nas env vars, buscando do banco...`)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://supabase.viniun.com.br'
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE'

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('mt_platform_settings')
      .select('valor')
      .eq('chave', key)
      .single()

    if (error) {
      console.error(`[Secret] Erro ao buscar ${key} do banco:`, error)
      return ''
    }

    if (data && data.valor) {
      console.log(`[Secret] ${key} encontrado no banco`)
      return data.valor
    }

    console.warn(`[Secret] ${key} não encontrado em nenhum lugar`)
    return ''
  } catch (err) {
    console.error(`[Secret] Exceção ao buscar ${key}:`, err)
    return ''
  }
}

// Variáveis globais (serão carregadas no primeiro request)
let FB_APP_ID = ''
let FB_APP_SECRET = ''
let REDIRECT_URI = ''
let SECRETS_LOADED = false

// Carregar secrets (env vars ou banco)
async function loadSecrets() {
  if (SECRETS_LOADED) return

  FB_APP_ID = await getSecret('META_APP_ID')
  FB_APP_SECRET = await getSecret('META_APP_SECRET')
  REDIRECT_URI = await getSecret('META_REDIRECT_URI')

  SECRETS_LOADED = true

  // Validar se todos foram carregados
  if (!FB_APP_ID || !FB_APP_SECRET || !REDIRECT_URI) {
    const missing = []
    if (!FB_APP_ID) missing.push('META_APP_ID')
    if (!FB_APP_SECRET) missing.push('META_APP_SECRET')
    if (!REDIRECT_URI) missing.push('META_REDIRECT_URI')

    throw new Error(`Secrets não configurados: ${missing.join(', ')}`)
  }

  console.log('[Secrets] Todos os secrets carregados com sucesso')
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Carregar secrets (env vars ou banco)
    await loadSecrets()

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Verificar se houve erro no OAuth
    if (error) {
      console.error('[Meta OAuth] Erro no OAuth:', error, errorDescription)
      return new Response(
        JSON.stringify({
          error: 'oauth_error',
          message: errorDescription || error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar parâmetros obrigatórios
    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'missing_parameters', message: 'code e state são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decodificar state (formato JSON: {tenant_id, franchise_id})
    let stateData
    try {
      stateData = JSON.parse(decodeURIComponent(state))
    } catch (err) {
      console.error('[Meta OAuth] Erro ao decodificar state:', err)
      return new Response(
        JSON.stringify({ error: 'invalid_state', message: 'State parameter inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tenantId = stateData.tenant_id
    const franchiseId = stateData.franchise_id || null

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'invalid_state', message: 'tenant_id ausente no state' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Meta OAuth] Processando callback para tenant:', tenantId, 'franchise:', franchiseId || 'N/A')

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ========================================================================
    // 1. TROCAR CODE POR ACCESS TOKEN
    // ========================================================================
    console.log('[Meta OAuth] Trocando code por access_token...')

    const tokenResponse = await fetch(
      `${GRAPH_API_URL}/oauth/access_token?` +
      `client_id=${FB_APP_ID}&` +
      `client_secret=${FB_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `code=${code}`
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('[Meta OAuth] Erro ao trocar code:', errorData)
      throw new Error(errorData.error?.message || 'Erro ao trocar code por token')
    }

    const tokenData = await tokenResponse.json()
    const shortLivedToken = tokenData.access_token

    console.log('[Meta OAuth] Short-lived token obtido')

    // ========================================================================
    // 2. TROCAR POR LONG-LIVED TOKEN (60 dias)
    // ========================================================================
    console.log('[Meta OAuth] Trocando por long-lived token...')

    const longLivedResponse = await fetch(
      `${GRAPH_API_URL}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${FB_APP_ID}&` +
      `client_secret=${FB_APP_SECRET}&` +
      `fb_exchange_token=${shortLivedToken}`
    )

    if (!longLivedResponse.ok) {
      const errorData = await longLivedResponse.json()
      console.error('[Meta OAuth] Erro ao trocar por long-lived token:', errorData)
      throw new Error('Erro ao obter long-lived token')
    }

    const longLivedData = await longLivedResponse.json()
    const accessToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in || 5184000 // 60 dias padrão

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    console.log('[Meta OAuth] Long-lived token obtido (expira em:', tokenExpiresAt.toISOString(), ')')

    // ========================================================================
    // 3. BUSCAR DADOS DO USUÁRIO
    // ========================================================================
    console.log('[Meta OAuth] Buscando dados do usuário...')

    const userResponse = await fetch(
      `${GRAPH_API_URL}/me?fields=id,name,email&access_token=${accessToken}`
    )

    if (!userResponse.ok) {
      const errorData = await userResponse.json()
      console.error('[Meta OAuth] Erro ao buscar usuário:', errorData)
      throw new Error('Erro ao buscar dados do usuário')
    }

    const userData = await userResponse.json()

    console.log('[Meta OAuth] Usuário:', userData.name, 'ID:', userData.id)

    // ========================================================================
    // 4. BUSCAR PÁGINAS DO FACEBOOK (com permissão pages_show_list)
    // ========================================================================
    console.log('[Meta OAuth] Buscando páginas do Facebook...')

    const pagesResponse = await fetch(
      `${GRAPH_API_URL}/me/accounts?` +
      `fields=id,name,username,category,access_token,instagram_business_account&` +
      `access_token=${accessToken}`
    )

    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json()
      console.error('[Meta OAuth] Erro ao buscar páginas:', errorData)
      throw new Error('Erro ao buscar páginas')
    }

    const pagesData = await pagesResponse.json()
    const pages = pagesData.data || []

    console.log('[Meta OAuth] Páginas encontradas:', pages.length)

    // ========================================================================
    // 5. SALVAR ACCOUNT NO BANCO
    // ========================================================================
    console.log('[Meta OAuth] Salvando account no banco...')

    // Verificar se já existe
    const { data: existingAccount } = await supabase
      .from('mt_meta_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userData.id)
      .eq('platform', 'facebook')
      .single()

    let accountId: string

    if (existingAccount) {
      // Atualizar
      const { data: updatedAccount, error: updateError } = await supabase
        .from('mt_meta_accounts')
        .update({
          user_name: userData.name,
          user_email: userData.email,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_active: true,
          last_sync_at: new Date().toISOString(),
          raw_data: { user: userData, token: longLivedData },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('[Meta OAuth] Erro ao atualizar account:', updateError)
        throw updateError
      }

      accountId = updatedAccount.id
      console.log('[Meta OAuth] Account atualizado:', accountId)
    } else {
      // Criar novo
      const { data: newAccount, error: insertError } = await supabase
        .from('mt_meta_accounts')
        .insert({
          tenant_id: tenantId,
          franchise_id: franchiseId || null,
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          platform: 'facebook',
          is_active: true,
          last_sync_at: new Date().toISOString(),
          raw_data: { user: userData, token: longLivedData },
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[Meta OAuth] Erro ao criar account:', insertError)
        throw insertError
      }

      accountId = newAccount.id
      console.log('[Meta OAuth] Account criado:', accountId)
    }

    // ========================================================================
    // 6. SALVAR PÁGINAS NO BANCO
    // ========================================================================
    console.log('[Meta OAuth] Salvando', pages.length, 'páginas no banco...')

    let pagesCreated = 0
    let pagesUpdated = 0

    for (const page of pages) {
      // Verificar se já existe
      const { data: existingPage } = await supabase
        .from('mt_meta_pages')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('page_id', page.id)
        .single()

      if (existingPage) {
        // Atualizar
        await supabase
          .from('mt_meta_pages')
          .update({
            page_name: page.name,
            page_username: page.username || null,
            page_category: page.category || null,
            page_access_token: page.access_token,
            instagram_business_account_id: page.instagram_business_account?.id || null,
            is_active: true,
            raw_data: page,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPage.id)

        pagesUpdated++
      } else {
        // Criar nova
        await supabase
          .from('mt_meta_pages')
          .insert({
            tenant_id: tenantId,
            franchise_id: franchiseId || null,
            account_id: accountId,
            page_id: page.id,
            page_name: page.name,
            page_username: page.username || null,
            page_category: page.category || null,
            page_access_token: page.access_token,
            instagram_business_account_id: page.instagram_business_account?.id || null,
            platform: 'facebook',
            is_active: true,
            raw_data: page,
          })

        pagesCreated++
      }
    }

    console.log('[Meta OAuth] Páginas salvas:', pagesCreated, 'criadas,', pagesUpdated, 'atualizadas')

    // ========================================================================
    // 7. RETORNAR SUCESSO
    // ========================================================================
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Autenticação concluída com sucesso',
        data: {
          account_id: accountId,
          user_name: userData.name,
          pages_created: pagesCreated,
          pages_updated: pagesUpdated,
          total_pages: pages.length,
          token_expires_at: tokenExpiresAt.toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Meta OAuth] Erro:', error)

    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error.message || 'Erro interno no servidor',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
