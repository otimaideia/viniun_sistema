/**
 * META TOKEN REFRESH - Edge Function
 *
 * Background job para renovar tokens do Meta que estão expirando
 *
 * Flow:
 * 1. Busca accounts com tokens expirando em 7 dias
 * 2. Troca access_token por novo long-lived token
 * 3. Atualiza no banco
 * 4. Notifica franquia se falhar
 *
 * Deve ser executado diariamente via cron job:
 * - Supabase pg_cron
 * - GitHub Actions
 * - Ou outro scheduler
 *
 * Request Body:
 * {
 *   "dry_run": false (opcional)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const FB_APP_ID = Deno.env.get('META_APP_ID') || ''
const FB_APP_SECRET = Deno.env.get('META_APP_SECRET') || ''

/**
 * Trocar access_token por novo long-lived token
 */
async function refreshAccessToken(oldToken: string): Promise<{
  success: boolean
  access_token?: string
  expires_in?: number
  error?: string
}> {
  try {
    const response = await fetch(
      `${GRAPH_API_URL}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${FB_APP_ID}&` +
      `client_secret=${FB_APP_SECRET}&` +
      `fb_exchange_token=${oldToken}`
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Token Refresh] Erro ao renovar:', errorData)
      return {
        success: false,
        error: errorData.error?.message || 'Erro desconhecido',
      }
    }

    const data = await response.json()

    return {
      success: true,
      access_token: data.access_token,
      expires_in: data.expires_in || 5184000, // 60 dias padrão
    }
  } catch (error) {
    console.error('[Token Refresh] Erro:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Criar notificação para franquia
 */
async function notifyTokenExpiration(
  supabase: any,
  tenantId: string,
  franchiseId: string | null,
  accountId: string,
  userName: string
) {
  try {
    await supabase.from('mt_notifications').insert({
      tenant_id: tenantId,
      franchise_id: franchiseId,
      type: 'meta_token_expired',
      title: 'Reconecte sua conta do Meta',
      message: `A conexão com a conta "${userName}" expirou. Reconecte para continuar recebendo mensagens.`,
      link: '/meta-messenger/config',
      severity: 'warning',
      is_read: false,
    })

    console.log('[Notification] Notificação criada para account:', accountId)
  } catch (error) {
    console.error('[Notification] Erro ao criar notificação:', error)
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dry_run = false }: { dry_run?: boolean } = await req.json().catch(() => ({}))

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar accounts com tokens expirando em 7 dias
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const { data: expiringAccounts, error: fetchError } = await supabase
      .from('mt_meta_accounts')
      .select('*')
      .lt('token_expires_at', sevenDaysFromNow.toISOString())
      .eq('is_active', true)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('[Token Refresh] Erro ao buscar accounts:', fetchError)
      throw fetchError
    }

    console.log('[Token Refresh] Accounts expirando:', expiringAccounts?.length || 0)

    if (!expiringAccounts || expiringAccounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma conta com token expirando',
          refreshed: 0,
          failed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (dry_run) {
      // Modo dry-run: apenas lista accounts sem renovar
      return new Response(
        JSON.stringify({
          dry_run: true,
          accounts: expiringAccounts.map((acc) => ({
            id: acc.id,
            user_name: acc.user_name,
            expires_at: acc.token_expires_at,
            days_until_expiry: Math.floor(
              (new Date(acc.token_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            ),
          })),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Renovar tokens
    let refreshedCount = 0
    let failedCount = 0
    const results = []

    for (const account of expiringAccounts) {
      console.log('[Token Refresh] Renovando token para:', account.user_name)

      const result = await refreshAccessToken(account.access_token)

      if (result.success && result.access_token) {
        // Atualizar no banco
        const newExpiresAt = new Date(Date.now() + (result.expires_in! * 1000))

        const { error: updateError } = await supabase
          .from('mt_meta_accounts')
          .update({
            access_token: result.access_token,
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id)

        if (updateError) {
          console.error('[Token Refresh] Erro ao atualizar account:', updateError)
          failedCount++
          results.push({
            account_id: account.id,
            user_name: account.user_name,
            status: 'failed',
            error: 'Erro ao atualizar no banco',
          })
        } else {
          refreshedCount++
          results.push({
            account_id: account.id,
            user_name: account.user_name,
            status: 'refreshed',
            new_expires_at: newExpiresAt.toISOString(),
          })
          console.log('[Token Refresh] Token renovado com sucesso para:', account.user_name)
        }
      } else {
        // Falha ao renovar
        failedCount++
        results.push({
          account_id: account.id,
          user_name: account.user_name,
          status: 'failed',
          error: result.error,
        })

        // Notificar franquia para reconectar
        await notifyTokenExpiration(
          supabase,
          account.tenant_id,
          account.franchise_id,
          account.id,
          account.user_name
        )

        console.error('[Token Refresh] Falha ao renovar token para:', account.user_name, result.error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${refreshedCount} tokens renovados, ${failedCount} falharam`,
        refreshed: refreshedCount,
        failed: failedCount,
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Token Refresh] Erro:', error)

    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
