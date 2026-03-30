#!/bin/bash

# Script de Verificação: Contratos da Julia (@julianabeauty)
# Data: 06/02/2026

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

echo "========================================"
echo "🔍 VERIFICAÇÃO DE CONTRATOS - JULIA"
echo "========================================"
echo ""

echo "📋 1. Dados da Influenciadora Julia"
echo "-----------------------------------"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id, nome_completo, codigo_indicacao, cpf, email, telefone, cidade, estado FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'' LIMIT 1"}' \
  | jq -r '.[] | "ID: \(.id)\nNome: \(.nome_completo)\nCódigo: \(.codigo_indicacao)\nCPF: \(.cpf // \"Não informado\")\nEmail: \(.email // \"Não informado\")\nTelefone: \(.telefone // \"Não informado\")\nCidade/UF: \(.cidade // \"?\") / \(.estado // \"?\")"'

echo ""
echo ""

echo "📄 2. Contratos da Julia"
echo "------------------------"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT c.id, c.numero, c.tipo AS modalidade, c.valor_mensal, c.data_inicio, c.data_fim, c.status, c.posts_mes, c.stories_mes, c.reels_mes FROM mt_influencer_contracts c WHERE c.influencer_id = (SELECT id FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'') ORDER BY c.created_at DESC"}' \
  | jq -r '.[] | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nID: \(.id)\nNúmero: \(.numero // \"Não gerado\")\nModalidade: \(.modalidade)\nValor Mensal: R$ \(.valor_mensal // 0)\nInício: \(.data_inicio)\nFim: \(.data_fim // \"Indeterminado\")\nStatus: \(.status)\nPosts/Mês: \(.posts_mes // 0)\nStories/Mês: \(.stories_mes // 0)\nReels/Mês: \(.reels_mes // 0)\n"'

echo ""
echo ""

echo "📦 3. Documentos Gerados (mt_influencer_contract_documents)"
echo "-----------------------------------------------------------"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT cd.id, cd.contract_id, cd.tipo_documento, cd.generated_at, u.nome AS gerado_por, cd.file_url FROM mt_influencer_contract_documents cd JOIN mt_influencer_contracts c ON c.id = cd.contract_id JOIN mt_users u ON u.id = cd.generated_by WHERE c.influencer_id = (SELECT id FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'') ORDER BY cd.generated_at DESC"}' \
  | jq -r 'if length == 0 then "❌ Nenhum documento gerado ainda" else .[] | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDoc ID: \(.id)\nContrato ID: \(.contract_id)\nTipo: \(.tipo_documento)\nGerado em: \(.generated_at)\nGerado por: \(.gerado_por)\nArquivo URL: \(.file_url // \"HTML (sem arquivo)\")\n" end'

echo ""
echo ""

echo "🖊️  4. Log de Assinaturas (mt_influencer_contract_signature_log)"
echo "----------------------------------------------------------------"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT sl.id, sl.contract_id, sl.acao, sl.access_time, sl.ip_address, sl.user_agent FROM mt_influencer_contract_signature_log sl JOIN mt_influencer_contracts c ON c.id = sl.contract_id WHERE c.influencer_id = (SELECT id FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'') ORDER BY sl.access_time DESC LIMIT 10"}' \
  | jq -r 'if length == 0 then "❌ Nenhuma atividade de assinatura registrada" else .[] | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nLog ID: \(.id)\nContrato ID: \(.contract_id)\nAção: \(.acao)\nData/Hora: \(.access_time)\nIP: \(.ip_address // \"N/A\")\nUser Agent: \(.user_agent // \"N/A\")\n" end'

echo ""
echo ""

echo "🏢 5. Tenant/Empresa"
echo "-------------------"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT t.id, t.slug, t.nome_fantasia, t.cnpj, t.endereco, t.cidade, t.estado FROM mt_tenants t JOIN mt_influencers i ON i.tenant_id = t.id WHERE i.codigo_indicacao = '\''JULIANABEAUTY'\'' LIMIT 1"}' \
  | jq -r '.[] | "Tenant: \(.nome_fantasia)\nSlug: \(.slug)\nCNPJ: \(.cnpj // \"Não informado\")\nEndereço: \(.endereco // \"Não informado\")\nCidade/UF: \(.cidade // \"?\") / \(.estado // \"?\")"'

echo ""
echo ""

echo "✅ RESUMO DA VERIFICAÇÃO"
echo "========================"

# Contar contratos
CONTRATOS_COUNT=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT COUNT(*) as count FROM mt_influencer_contracts WHERE influencer_id = (SELECT id FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'')"}' \
  | jq -r '.[0].count // 0')

# Contar documentos
DOCS_COUNT=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT COUNT(*) as count FROM mt_influencer_contract_documents cd JOIN mt_influencer_contracts c ON c.id = cd.contract_id WHERE c.influencer_id = (SELECT id FROM mt_influencers WHERE codigo_indicacao = '\''JULIANABEAUTY'\'')"}' \
  | jq -r '.[0].count // 0')

echo "📊 Total de contratos: $CONTRATOS_COUNT"
echo "📦 Total de documentos gerados: $DOCS_COUNT"

if [ "$DOCS_COUNT" -eq 0 ]; then
  echo ""
  echo "⚠️  AÇÃO NECESSÁRIA:"
  echo "   1. Fazer login no sistema"
  echo "   2. Acessar: Influenciadoras → @julianabeauty → Contratos"
  echo "   3. Selecionar um contrato"
  echo "   4. Clicar em 'Imprimir/Salvar PDF' ou 'Visualizar e Imprimir'"
  echo "   5. Verificar se documento é salvo na tabela mt_influencer_contract_documents"
else
  echo ""
  echo "✅ Sistema possui documentos gerados. Pronto para teste de impressão!"
fi

echo ""
echo "========================================"
echo "FIM DA VERIFICAÇÃO"
echo "========================================"
