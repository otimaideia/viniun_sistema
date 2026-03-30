// =============================================================================
// EDGE FUNCTION: contract-public-access
// =============================================================================
// Acesso público a contratos de influenciadoras para assinatura digital.
// NÃO requer autenticação — valida via session token.
// Usa SERVICE_ROLE_KEY para bypassar RLS.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "validate-token"
  | "validate-identity"
  | "register-signature"
  | "get-aditivos"
  | "update-profile";

interface RequestBody {
  action: Action;
  contractId: string;
  token: string;
  // validate-identity
  whatsapp?: string;
  cpf?: string;
  // register-signature
  signatureData?: {
    canvas_data: string;
    ip_address: string;
    user_agent: string;
  };
  // update-profile
  profileData?: Record<string, unknown>;
  socialNetworks?: Array<{
    plataforma: string;
    usuario: string;
    url?: string;
    seguidores?: number;
  }>;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================================
// Validar Session Token
// =============================================================================

async function validateToken(
  supabase: ReturnType<typeof createClient>,
  contractId: string,
  token: string
) {
  // Buscar session token no access log (qualquer ação com esse token é válida)
  const { data: session, error: sessionError } = await supabase
    .from("mt_influencer_contract_access_log")
    .select("*")
    .eq("contract_id", contractId)
    .eq("session_token", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError || !session) {
    return { valid: false, error: "Token de sessão inválido ou não encontrado" };
  }

  // Verificar expiração
  if (session.session_expires_at) {
    const expiresAt = new Date(session.session_expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: "Token de sessão expirado" };
    }
  }

  // Buscar contrato
  const { data: contrato, error: contratoError } = await supabase
    .from("mt_influencer_contracts")
    .select("*, influencer:mt_influencers(id, nome, nome_completo, nome_artistico, cpf, rg, email, telefone, whatsapp, eh_menor, responsavel_legal_nome, responsavel_legal_cpf, responsavel_legal_rg, responsavel_legal_parentesco, endereco, numero, bairro, cidade, estado, cep, estado_civil, profissao, naturalidade)")
    .eq("id", contractId)
    .single();

  if (contratoError || !contrato) {
    return { valid: false, error: "Contrato não encontrado" };
  }

  // Buscar branding do tenant (para exibir logo)
  const { data: branding } = await supabase
    .from("mt_tenant_branding")
    .select("logo_url, logo_branco_url, cor_primaria, cor_secundaria, favicon_url")
    .eq("tenant_id", contrato.tenant_id)
    .maybeSingle();

  // Buscar tenant info
  const { data: tenantInfo } = await supabase
    .from("mt_tenants")
    .select("slug, nome_fantasia, cnpj, cidade, estado")
    .eq("id", contrato.tenant_id)
    .maybeSingle();

  // Buscar franquia (para dados do contrato)
  let franchiseData = null;
  if (contrato.franchise_id) {
    const { data: franchise } = await supabase
      .from("mt_franchises")
      .select("id, nome, nome_fantasia, cnpj, endereco, cidade, estado, cep, responsavel_nome")
      .eq("id", contrato.franchise_id)
      .maybeSingle();
    franchiseData = franchise;
  }

  // Buscar documento do contrato
  const { data: documento } = await supabase
    .from("mt_influencer_contract_documents")
    .select("id, nome_arquivo, tipo_documento, hash_arquivo, tamanho, mime_type, conteudo_base64")
    .eq("contract_id", contractId)
    .eq("tipo_documento", "contrato_principal")
    .maybeSingle();

  // Buscar redes sociais da influenciadora
  const { data: socialNetworks } = await supabase
    .from("mt_influencer_social_networks")
    .select("id, plataforma, usuario, url, seguidores, engajamento, verificado, username")
    .eq("influencer_id", contrato.influencer_id)
    .order("plataforma");

  return {
    valid: true,
    contrato,
    influenciadora: contrato.influencer,
    branding,
    tenant: tenantInfo,
    franchise: franchiseData,
    documento,
    socialNetworks: socialNetworks || [],
  };
}

// =============================================================================
// Validar Identidade
// =============================================================================

async function validateIdentity(
  supabase: ReturnType<typeof createClient>,
  contractId: string,
  token: string,
  whatsapp: string,
  cpf?: string,
) {
  // Buscar contrato para pegar influencer_id e tenant_id
  const { data: contrato, error: contratoError } = await supabase
    .from("mt_influencer_contracts")
    .select("id, influencer_id, tenant_id")
    .eq("id", contractId)
    .single();

  if (contratoError || !contrato) {
    return { sucesso: false, motivo: "Contrato não encontrado" };
  }

  // Buscar dados da influenciadora
  const { data: influencer, error: influencerError } = await supabase
    .from("mt_influencers")
    .select("id, whatsapp, cpf, telefone")
    .eq("id", contrato.influencer_id)
    .single();

  if (influencerError || !influencer) {
    return { sucesso: false, motivo: "Influenciadora não encontrada" };
  }

  // Validar WhatsApp (comparar apenas dígitos)
  const inputWhatsapp = whatsapp.replace(/\D/g, "");
  const dbWhatsapp = (influencer.whatsapp || "").replace(/\D/g, "");
  const whatsappMatch = inputWhatsapp.length >= 10 && dbWhatsapp.includes(inputWhatsapp.slice(-10));

  const sucesso = whatsappMatch;

  // Registrar tentativa
  await supabase
    .from("mt_influencer_contract_access_log")
    .insert({
      tenant_id: contrato.tenant_id,
      contract_id: contractId,
      influencer_id: contrato.influencer_id,
      acao: "validacao_identidade",
      session_token: token,
      cpf_informado: cpf || null,
      validacao_sucesso: sucesso,
      user_agent: null,
      detalhes: {
        whatsapp_match: whatsappMatch,
        validated_at: new Date().toISOString(),
      },
    });

  return {
    sucesso,
    motivo: !sucesso ? "O WhatsApp informado não confere com o cadastro" : undefined,
  };
}

// =============================================================================
// Registrar Assinatura
// =============================================================================

async function registerSignatureAction(
  supabase: ReturnType<typeof createClient>,
  contractId: string,
  token: string,
  signatureData: { canvas_data: string; ip_address: string; user_agent: string }
) {
  // Buscar contrato
  const { data: contrato, error: contratoError } = await supabase
    .from("mt_influencer_contracts")
    .select("id, influencer_id, tenant_id, status, assinado")
    .eq("id", contractId)
    .single();

  if (contratoError || !contrato) {
    return { sucesso: false, error: "Contrato não encontrado" };
  }

  // Verificar se documento existe
  const { data: existingDocument } = await supabase
    .from("mt_influencer_contract_documents")
    .select("id, nome_arquivo, hash_arquivo")
    .eq("contract_id", contractId)
    .eq("tipo_documento", "contrato_principal")
    .maybeSingle();

  if (!existingDocument) {
    return { sucesso: false, error: "Documento do contrato não encontrado" };
  }

  const now = new Date().toISOString();

  // 1. Registrar log de assinatura
  const { error: logError } = await supabase
    .from("mt_influencer_contract_access_log")
    .insert({
      tenant_id: contrato.tenant_id,
      contract_id: contractId,
      influencer_id: contrato.influencer_id,
      acao: "assinatura",
      session_token: token,
      assinatura_data: now,
      assinatura_canvas_data: signatureData.canvas_data,
      ip_address: signatureData.ip_address,
      user_agent: signatureData.user_agent,
      detalhes: {
        signed_at: now,
        canvas_data_length: signatureData.canvas_data.length,
      },
    });

  if (logError) {
    return { sucesso: false, error: `Erro ao registrar log: ${logError.message}` };
  }

  // 2. Atualizar contrato: assinado = true, status = 'ativo'
  const statusAnterior = contrato.status;
  const { error: contractError } = await supabase
    .from("mt_influencer_contracts")
    .update({
      assinado: true,
      assinado_em: now,
      status: "ativo",
      updated_at: now,
    })
    .eq("id", contractId);

  if (contractError) {
    return { sucesso: false, error: `Erro ao atualizar contrato: ${contractError.message}` };
  }

  // 3. Registrar histórico
  await supabase
    .from("mt_influencer_contract_history")
    .insert({
      tenant_id: contrato.tenant_id,
      contract_id: contractId,
      tipo_alteracao: "assinatura",
      status_anterior: statusAnterior,
      status_novo: "ativo",
      motivo: "Assinatura digital realizada",
      ip_address: signatureData.ip_address,
      user_agent: signatureData.user_agent,
    });

  // 4. Gerar certificado de assinatura
  const signatureHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signatureData.canvas_data)
  );
  const hashHex = Array.from(new Uint8Array(signatureHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const certificateData = {
    contract_id: contractId,
    influencer_id: contrato.influencer_id,
    signature_date: now,
    signature_hash: hashHex,
    document_signed: {
      document_id: existingDocument.id,
      document_name: existingDocument.nome_arquivo,
      document_hash: existingDocument.hash_arquivo,
      verified: true,
    },
    ip_address: signatureData.ip_address,
    user_agent: signatureData.user_agent,
  };

  const certificateContent = JSON.stringify(certificateData, null, 2);
  const certificateBase64 = btoa(certificateContent);

  const docHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(certificateContent)
  );
  const docHashHex = Array.from(new Uint8Array(docHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabase
    .from("mt_influencer_contract_documents")
    .insert({
      tenant_id: contrato.tenant_id,
      contract_id: contractId,
      tipo_documento: "certificado",
      nome_arquivo: `Certificado_Assinatura_${contractId}.json`,
      conteudo_base64: certificateBase64,
      hash_arquivo: docHashHex,
      tamanho: certificateContent.length,
      mime_type: "application/json",
      metadata: certificateData,
    });

  // 5. Disparar notificação de assinatura confirmada (fire-and-forget)
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    fetch(`${supabaseUrl}/functions/v1/send-contract-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        influencerId: contrato.influencer_id,
        contractId,
        tenantId: contrato.tenant_id,
        type: "assinatura_confirmada",
      }),
    }).catch(err => console.error("[contract-public-access] Erro ao notificar assinatura:", err));
  } catch (_) { /* ignora */ }

  return { sucesso: true, signed_at: now };
}

// =============================================================================
// Atualizar Perfil (campos faltantes + redes sociais)
// =============================================================================

async function updateProfileAction(
  supabase: ReturnType<typeof createClient>,
  contractId: string,
  token: string,
  profileData?: Record<string, unknown>,
  socialNetworks?: Array<{ plataforma: string; usuario: string; url?: string; seguidores?: number }>
) {
  // Buscar contrato para pegar influencer_id e tenant_id
  const { data: contrato, error: contratoError } = await supabase
    .from("mt_influencer_contracts")
    .select("id, influencer_id, tenant_id")
    .eq("id", contractId)
    .single();

  if (contratoError || !contrato) {
    return { sucesso: false, error: "Contrato não encontrado" };
  }

  // Campos permitidos para atualização pública
  const allowedFields = [
    "nome_completo", "cpf", "rg", "email",
    "endereco", "numero", "bairro", "cidade", "estado", "cep", "complemento",
    "estado_civil", "profissao", "naturalidade",
    "instagram", "tiktok", "youtube",
    "eh_menor", "responsavel_legal_nome", "responsavel_legal_cpf",
    "responsavel_legal_rg", "responsavel_legal_parentesco",
  ];

  // 1. Atualizar dados do perfil
  if (profileData && Object.keys(profileData).length > 0) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(profileData)) {
      if (allowedFields.includes(key) && value !== undefined && value !== null && value !== "") {
        sanitized[key] = value;
      }
    }

    if (Object.keys(sanitized).length > 0) {
      sanitized.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("mt_influencers")
        .update(sanitized)
        .eq("id", contrato.influencer_id);

      if (updateError) {
        console.error("[contract-public-access] Erro ao atualizar perfil:", updateError);
        return { sucesso: false, error: `Erro ao atualizar perfil: ${updateError.message}` };
      }
    }
  }

  // 2. Atualizar redes sociais
  if (socialNetworks && socialNetworks.length > 0) {
    for (const sn of socialNetworks) {
      if (!sn.plataforma || !sn.usuario) continue;

      // Upsert: se já existe para essa plataforma, atualiza
      const { data: existing } = await supabase
        .from("mt_influencer_social_networks")
        .select("id")
        .eq("influencer_id", contrato.influencer_id)
        .eq("plataforma", sn.plataforma)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("mt_influencer_social_networks")
          .update({
            usuario: sn.usuario,
            username: sn.usuario,
            url: sn.url || null,
            seguidores: sn.seguidores || 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("mt_influencer_social_networks")
          .insert({
            tenant_id: contrato.tenant_id,
            influencer_id: contrato.influencer_id,
            plataforma: sn.plataforma,
            usuario: sn.usuario,
            username: sn.usuario,
            url: sn.url || null,
            seguidores: sn.seguidores || 0,
          });
      }
    }
  }

  // Retornar dados atualizados
  const { data: updatedInfluencer } = await supabase
    .from("mt_influencers")
    .select("id, nome, nome_completo, nome_artistico, cpf, rg, email, telefone, whatsapp, eh_menor, responsavel_legal_nome, responsavel_legal_cpf, responsavel_legal_rg, responsavel_legal_parentesco, endereco, numero, bairro, cidade, estado, cep, estado_civil, profissao, naturalidade, instagram, tiktok, youtube")
    .eq("id", contrato.influencer_id)
    .single();

  const { data: updatedSocialNetworks } = await supabase
    .from("mt_influencer_social_networks")
    .select("id, plataforma, usuario, url, seguidores, engajamento, verificado, username")
    .eq("influencer_id", contrato.influencer_id)
    .order("plataforma");

  return {
    sucesso: true,
    influenciadora: updatedInfluencer,
    socialNetworks: updatedSocialNetworks || [],
  };
}

// =============================================================================
// Buscar Aditivos
// =============================================================================

async function getAditivos(
  supabase: ReturnType<typeof createClient>,
  contractId: string
) {
  const { data, error } = await supabase
    .from("mt_influencer_contract_history")
    .select("*")
    .eq("contract_id", contractId)
    .eq("tipo_alteracao", "aditivo")
    .order("created_at", { ascending: true });

  if (error) {
    return { aditivos: [], error: error.message };
  }

  return { aditivos: data || [] };
}

// =============================================================================
// Handler Principal
// =============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: RequestBody = await req.json();
    const { action, contractId, token } = body;

    if (!action || !contractId || !token) {
      return jsonResponse({ error: "action, contractId e token são obrigatórios" }, 400);
    }

    console.log(`[contract-public-access] action=${action} contractId=${contractId}`);

    switch (action) {
      case "validate-token": {
        const result = await validateToken(supabase, contractId, token);
        if (!result.valid) {
          return jsonResponse({ error: result.error }, 403);
        }
        return jsonResponse(result);
      }

      case "validate-identity": {
        if (!body.whatsapp) {
          return jsonResponse({ error: "WhatsApp é obrigatório" }, 400);
        }
        const result = await validateIdentity(
          supabase, contractId, token,
          body.whatsapp, body.cpf
        );
        return jsonResponse(result);
      }

      case "register-signature": {
        if (!body.signatureData) {
          return jsonResponse({ error: "signatureData é obrigatório" }, 400);
        }
        const result = await registerSignatureAction(
          supabase, contractId, token, body.signatureData
        );
        if (!result.sucesso) {
          return jsonResponse({ error: result.error }, 400);
        }
        return jsonResponse(result);
      }

      case "get-aditivos": {
        const result = await getAditivos(supabase, contractId);
        return jsonResponse(result);
      }

      case "update-profile": {
        const result = await updateProfileAction(
          supabase, contractId, token,
          body.profileData, body.socialNetworks
        );
        if (!result.sucesso) {
          return jsonResponse({ error: result.error }, 400);
        }
        return jsonResponse(result);
      }

      default:
        return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[contract-public-access] Erro geral:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
